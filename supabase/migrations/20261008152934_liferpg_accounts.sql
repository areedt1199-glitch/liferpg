-- This migration is additive. No existing user data is reset.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.journey_definitions (
  id text primary key, title text not null, description text not null
);
create table public.quest_definitions (
  id text primary key, goal_id text not null references public.journey_definitions(id),
  position integer not null check (position > 0), title text not null, task text not null,
  place text not null, success text not null, minutes integer not null check (minutes between 1 and 180),
  xp integer not null check (xp >= 0), coins integer not null check (coins >= 0),
  unique (goal_id, position)
);
create table public.quest_steps (
  quest_id text not null references public.quest_definitions(id), id text not null,
  position integer not null check (position > 0), text text not null,
  primary key (quest_id, id), unique (quest_id, position)
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  character_name text not null default 'นักเดินทางใบไม้' check (char_length(btrim(character_name)) between 1 and 40)
);
create table public.user_progress (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  selected_goal_id text references public.journey_definitions(id), active_quest_id text references public.quest_definitions(id),
  goal_completed_at timestamptz, check (goal_completed_at is null or active_quest_id is null)
);
create table public.quest_progress (
  user_id uuid not null references public.user_progress(user_id) on delete cascade,
  quest_id text not null references public.quest_definitions(id),
  status text not null check (status in ('locked','available','in_progress','completed')),
  completed_at timestamptz,
  primary key (user_id, quest_id),
  check ((status = 'completed') = (completed_at is not null))
);
create unique index one_active_quest_per_user on public.quest_progress(user_id) where status = 'in_progress';
alter table public.user_progress add constraint active_quest_owned foreign key (user_id, active_quest_id)
  references public.quest_progress(user_id, quest_id) deferrable initially deferred;
create table public.checklist (
  user_id uuid not null, quest_id text not null, step_id text not null,
  primary key (user_id, quest_id, step_id),
  foreign key (user_id, quest_id) references public.quest_progress(user_id, quest_id) on delete cascade,
  foreign key (quest_id, step_id) references public.quest_steps(quest_id, id)
);
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, quest_id text not null,
  created_at timestamptz not null default clock_timestamp(),
  status text not null check (status in ('running','paused','finished','closed')),
  duration_ms bigint not null check (duration_ms > 0), elapsed_ms bigint not null default 0,
  started_at timestamptz,
  foreign key (user_id, quest_id) references public.quest_progress(user_id, quest_id) on delete cascade,
  check (elapsed_ms between 0 and duration_ms),
  check ((status = 'running') = (started_at is not null)),
  check (status <> 'running' or elapsed_ms < duration_ms),
  check (status <> 'finished' or elapsed_ms = duration_ms)
);
create unique index one_running_session_per_user on public.focus_sessions(user_id) where status = 'running';
create index focus_by_quest on public.focus_sessions(user_id, quest_id, created_at desc);
create table public.reward_ledger (
  user_id uuid not null, quest_id text not null,
  completed_at timestamptz not null, xp integer not null check (xp >= 0), coins integer not null check (coins >= 0),
  total_xp_before bigint not null check (total_xp_before >= 0),
  primary key (user_id, quest_id),
  foreign key (user_id, quest_id) references public.quest_progress(user_id, quest_id) on delete cascade
);
-- Ledger is the only source of balances; there are no separately writable XP/coin columns.

alter table public.journey_definitions enable row level security;
alter table public.quest_definitions enable row level security;
alter table public.quest_steps enable row level security;
alter table public.profiles enable row level security;
alter table public.user_progress enable row level security;
alter table public.quest_progress enable row level security;
alter table public.checklist enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.reward_ledger enable row level security;
revoke all on public.journey_definitions, public.quest_definitions, public.quest_steps, public.profiles,
 public.user_progress, public.quest_progress, public.checklist, public.focus_sessions, public.reward_ledger from public, anon, authenticated;
grant select on public.journey_definitions, public.quest_definitions, public.quest_steps, public.profiles,
 public.user_progress, public.quest_progress, public.checklist, public.focus_sessions, public.reward_ledger to authenticated;
grant update(character_name) on public.profiles to authenticated;
create policy definitions_read on public.journey_definitions for select to authenticated using (true);
create policy quests_read on public.quest_definitions for select to authenticated using (true);
create policy steps_read on public.quest_steps for select to authenticated using (true);
create policy profile_read on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy profile_name_update on public.profiles for update to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_progress_read on public.user_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy own_quests_read on public.quest_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy own_checklist_read on public.checklist for select to authenticated using ((select auth.uid()) = user_id);
create policy own_focus_read on public.focus_sessions for select to authenticated using ((select auth.uid()) = user_id);
create policy own_rewards_read on public.reward_ledger for select to authenticated using ((select auth.uid()) = user_id);

-- Internal helpers are not executable by API roles. Only the two authenticated entrypoints below are.
create function private.ensure_user() returns uuid language plpgsql security invoker set search_path = '' as $$
declare u uuid := auth.uid();
begin
 if u is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
 if not exists (select 1 from public.journey_definitions where id = 'first-game') then raise exception 'DEFINITIONS_MISSING'; end if;
 insert into public.profiles(user_id) values (u) on conflict do nothing;
 insert into public.user_progress(user_id) values (u) on conflict do nothing;
 perform 1 from public.user_progress where user_id = u for update;
 insert into public.quest_progress(user_id,quest_id,status)
 select u,id,case when position=1 then 'available' else 'locked' end from public.quest_definitions
 where goal_id='first-game' on conflict do nothing;
 return u;
end $$;
create function private.settle_session(u uuid, at_time timestamptz, close_round boolean default false) returns void
 language plpgsql security invoker set search_path = '' as $$
declare s public.focus_sessions; used bigint;
begin
 select * into s from public.focus_sessions where user_id=u and status='running' for update;
 if not found then return; end if;
 used := least(s.duration_ms-s.elapsed_ms,greatest(0,floor(extract(epoch from (at_time-s.started_at))*1000)::bigint));
 if close_round or s.elapsed_ms+used=s.duration_ms then
   update public.focus_sessions set elapsed_ms=s.elapsed_ms+used, started_at=null,
    status=case when close_round then 'closed' else 'finished' end where id=s.id;
   update public.user_progress set revision=revision+1 where user_id=u;
 end if;
end $$;

create function private.snapshot() returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; at_time timestamptz; p public.user_progress; quest public.quest_definitions;
 f jsonb := '{}'::jsonb; s public.focus_sessions; checked jsonb; total bigint; rounds jsonb;
begin
 u:=private.ensure_user(); at_time:=clock_timestamp();
 perform private.settle_session(u,at_time);
 select * into p from public.user_progress where user_id=u;
 for quest in select * from public.quest_definitions where goal_id='first-game' order by position loop
   select coalesce(jsonb_agg(c.step_id order by t.position),'[]'::jsonb) into checked from public.checklist c
    join public.quest_steps t on t.quest_id=c.quest_id and t.id=c.step_id where c.user_id=u and c.quest_id=quest.id;
   select coalesce(sum(elapsed_ms),0) into total from public.focus_sessions where user_id=u and quest_id=quest.id;
   select * into s from public.focus_sessions where user_id=u and quest_id=quest.id order by created_at desc,id desc limit 1;
   if not found then rounds:=jsonb_build_object('status','idle','durationMs',quest.minutes*60000,'elapsedMs',0,'startedAt',null);
   else rounds:=jsonb_build_object('status',case when s.status='closed' then case when s.elapsed_ms=s.duration_ms then 'finished' else 'paused' end else s.status end,
    'durationMs',s.duration_ms,'elapsedMs',s.elapsed_ms,'startedAt',case when s.started_at is null then null else floor(extract(epoch from s.started_at)*1000)::bigint end); end if;
   f:=f||jsonb_build_object(quest.id,jsonb_build_object('checkedStepIds',checked,'totalMs',total,'round',rounds));
 end loop;
 return jsonb_build_object('userId',u,'characterName',(select character_name from public.profiles where user_id=u),
  'revision',p.revision,'serverNow',floor(extract(epoch from at_time)*1000)::bigint,
  'progress',jsonb_build_object('version',3,'selectedGoalId',p.selected_goal_id,'activeQuestId',p.active_quest_id,
   'goalCompletedAt',case when p.goal_completed_at is null then null else floor(extract(epoch from p.goal_completed_at)*1000)::bigint end,
   'totalXP',(select coalesce(sum(xp),0) from public.reward_ledger where user_id=u),
   'coins',(select coalesce(sum(coins),0) from public.reward_ledger where user_id=u),
   'quests',(select jsonb_object_agg(quest_id,status) from public.quest_progress where user_id=u), 'focus',f,
   'rewards',coalesce((select jsonb_object_agg(quest_id,jsonb_build_object('questId',quest_id,'completedAt',floor(extract(epoch from completed_at)*1000)::bigint,'xp',xp,'coins',coins,'totalXPBefore',total_xp_before)) from public.reward_ledger where user_id=u),'{}'::jsonb)));
end $$;

create function private.command(action text, payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare u uuid; at_time timestamptz; p public.user_progress; q public.quest_definitions; qp public.quest_progress;
 s public.focus_sessions; used bigint; next_id text; target text := payload->>'questId';
begin
 u:=private.ensure_user(); at_time:=clock_timestamp();
 select * into p from public.user_progress where user_id=u;
 if action='select' then
   if payload->>'goalId' <> 'first-game' or payload->>'goalId' is null then raise exception 'GOAL_INVALID'; end if;
   update public.user_progress set selected_goal_id='first-game',revision=revision+1 where user_id=u;
   return private.snapshot();
 end if;
 select * into q from public.quest_definitions where id=target and goal_id='first-game';
 if not found then raise exception 'QUEST_INVALID'; end if;
 select * into qp from public.quest_progress where user_id=u and quest_id=q.id;
 if action='complete' and qp.status='completed' then return private.snapshot(); end if;
 if action='finish' and qp.status='completed' then return private.snapshot(); end if;
 if action='start_quest' then
   if qp.status='in_progress' and p.active_quest_id=q.id then return private.snapshot(); end if;
   if p.selected_goal_id is distinct from q.goal_id or p.active_quest_id is not null or qp.status<>'available' then raise exception 'QUEST_UNAVAILABLE'; end if;
   if exists (select 1 from public.quest_definitions d join public.quest_progress x on x.quest_id=d.id and x.user_id=u where d.goal_id=q.goal_id and d.position<q.position and x.status<>'completed') then raise exception 'QUEST_LOCKED'; end if;
   update public.quest_progress set status='in_progress' where user_id=u and quest_id=q.id;
   update public.user_progress set active_quest_id=q.id,revision=revision+1 where user_id=u;
   return private.snapshot();
 end if;
 if p.active_quest_id is distinct from q.id or qp.status<>'in_progress' then raise exception 'QUEST_NOT_ACTIVE'; end if;
 if not exists (select 1 from public.quest_steps where quest_id=q.id) then raise exception 'DEFINITIONS_MISSING'; end if;
 if action='check' then
   if not exists (select 1 from public.quest_steps where quest_id=q.id and id=payload->>'stepId') or jsonb_typeof(payload->'checked') is distinct from 'boolean' then raise exception 'STEP_INVALID'; end if;
   if (payload->>'checked')::boolean then insert into public.checklist(user_id,quest_id,step_id) values(u,q.id,payload->>'stepId') on conflict do nothing;
   else delete from public.checklist where user_id=u and quest_id=q.id and step_id=payload->>'stepId'; end if;
 elsif action='complete' then
   if exists (select 1 from public.quest_steps t where t.quest_id=q.id and not exists (select 1 from public.checklist c where c.user_id=u and c.quest_id=t.quest_id and c.step_id=t.id)) then raise exception 'CHECKLIST_INCOMPLETE'; end if;
   perform private.settle_session(u,at_time,true);
   insert into public.reward_ledger(user_id,quest_id,completed_at,xp,coins,total_xp_before)
    values(u,q.id,at_time,q.xp,q.coins,(select coalesce(sum(xp),0) from public.reward_ledger where user_id=u));
   update public.quest_progress set status='completed',completed_at=at_time where user_id=u and quest_id=q.id;
   select id into next_id from public.quest_definitions where goal_id=q.goal_id and position=q.position+1;
   update public.user_progress set active_quest_id=null,goal_completed_at=case when next_id is null then at_time else null end where user_id=u;
   if next_id is not null then update public.quest_progress set status='available' where user_id=u and quest_id=next_id and status='locked'; end if;
 elsif action in ('start','pause','resume','new','finish') then
   perform private.settle_session(u,at_time);
   select * into s from public.focus_sessions where user_id=u and quest_id=q.id order by created_at desc,id desc limit 1 for update;
   if (action='start' and s.id is null) or (action='new' and s.status='finished') then
    insert into public.focus_sessions(user_id,quest_id,status,duration_ms,started_at,created_at) values(u,q.id,'running',q.minutes*60000,at_time,at_time);
   elsif action='pause' and s.status='running' then
    used:=least(s.duration_ms-s.elapsed_ms,greatest(0,floor(extract(epoch from (at_time-s.started_at))*1000)::bigint));
    update public.focus_sessions set status='paused',elapsed_ms=s.elapsed_ms+used,started_at=null where id=s.id;
   elsif action='resume' and s.status='paused' then update public.focus_sessions set status='running',started_at=at_time where id=s.id;
   end if;
 else raise exception 'ACTION_INVALID'; end if;
 update public.user_progress set revision=revision+1 where user_id=u;
 return private.snapshot();
end $$;

-- Narrow API entrypoints. Privilege is required for atomic writes that clients must never perform directly.
create function public.liferpg_snapshot() returns jsonb language sql security invoker set search_path = '' as $$ select private.snapshot(); $$;
create function public.liferpg_command(action text, payload jsonb) returns jsonb language sql security invoker set search_path = '' as $$ select private.command(action,payload); $$;
revoke all on function private.ensure_user(), private.settle_session(uuid,timestamptz,boolean), private.snapshot(), private.command(text,jsonb), public.liferpg_snapshot(), public.liferpg_command(text,jsonb) from public, anon, authenticated;
grant execute on function private.snapshot(), private.command(text,jsonb), public.liferpg_snapshot(), public.liferpg_command(text,jsonb) to authenticated;
