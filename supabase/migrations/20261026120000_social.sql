-- Social layer: an opt-in public portfolio per player, and guilds (study groups / classrooms) with a weekly XP board.
-- Nothing here changes rewards. Balances still come only from reward_ledger and practice_log.

-- Portfolio: players pick a handle and choose to publish. Private by default.
alter table public.profiles
 add column handle text unique check(handle ~ '^[a-z0-9_]{3,24}$'),
 add column is_public boolean not null default false,
 add constraint public_needs_handle check(not is_public or handle is not null);
grant update(handle,is_public) on public.profiles to authenticated;

-- XP earned since a moment (quest rewards plus daily practice), the same sources the snapshot totals.
create function private.xp_since(u uuid,since timestamptz) returns bigint language sql stable security definer set search_path='' as $$
 select coalesce((select sum(xp) from public.reward_ledger where user_id=u and completed_at>=since),0)
  +coalesce((select sum(xp) from public.practice_log where user_id=u and completed_at>=since),0);
$$;
revoke all on function private.xp_since(uuid,timestamptz) from public,anon,authenticated;

-- Read-only public view of one published player. Journal, evidence photos, review text and coins stay private.
create function public.liferpg_portfolio(h text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pr public.profiles; skin text; goals jsonb; quests jsonb;
begin
 select * into pr from public.profiles where handle=lower(btrim(h)) and is_public;
 if not found then return null; end if;
 select equipped_skin_id into skin from public.user_progress where user_id=pr.user_id;
 select coalesce(jsonb_agg(jsonb_build_object('goalId',g.goal_id,'startedAt',floor(extract(epoch from g.started_at)*1000)::bigint,
   'completedAt',case when g.completed_at is null then null else floor(extract(epoch from g.completed_at)*1000)::bigint end,
   'done',(select count(distinct l.quest_id) from public.reward_ledger l join public.quest_definitions d on d.id=l.quest_id where l.user_id=pr.user_id and d.goal_id=g.goal_id))
   order by g.completed_at desc nulls first,g.started_at desc),'[]'::jsonb)
  into goals from public.user_goals g where g.user_id=pr.user_id;
 select coalesce(jsonb_agg(jsonb_build_object('questId',q.quest_id,'completedAt',floor(extract(epoch from q.at)*1000)::bigint,
   'reviewed',exists(select 1 from public.quest_reviews r where r.user_id=pr.user_id and r.quest_id=q.quest_id and r.passed_at is not null)) order by q.at desc),'[]'::jsonb)
  into quests from (select quest_id,max(completed_at) as at from public.reward_ledger where user_id=pr.user_id group by quest_id order by 2 desc limit 200) q;
 return jsonb_build_object('handle',pr.handle,'name',pr.character_name,'skinId',coalesce(skin,'swordsman'),
  'totalXP',private.xp_since(pr.user_id,'-infinity'),'goals',goals,'quests',quests,
  'bosses',(select count(*) from public.boss_results where user_id=pr.user_id and passed_at is not null),
  'practiceDays',(select count(distinct practice_day) from public.practice_log where user_id=pr.user_id));
end $$;
revoke all on function public.liferpg_portfolio(text) from public;
grant execute on function public.liferpg_portfolio(text) to anon,authenticated;

-- Guilds: one player creates, others join with a 6-letter code. Tables are reachable only through liferpg_guild().
create table public.guilds(
 id uuid primary key default gen_random_uuid(),
 name text not null check(char_length(btrim(name)) between 1 and 40),
 code text not null unique check(code ~ '^[A-HJ-NP-Z2-9]{6}$'),
 owner_id uuid not null references public.profiles(user_id) on delete cascade,
 created_at timestamptz not null default clock_timestamp()
);
create index guilds_owner_idx on public.guilds(owner_id);
create table public.guild_members(
 guild_id uuid not null references public.guilds(id) on delete cascade,
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 joined_at timestamptz not null default clock_timestamp(),
 primary key(guild_id,user_id)
);
create index guild_members_user_idx on public.guild_members(user_id);
alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
revoke all on public.guilds,public.guild_members from public,anon,authenticated;

create function private.guild_list(u uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'isOwner',g.owner_id=u,
   'members',(select count(*) from public.guild_members x where x.guild_id=g.id)) order by m.joined_at),'[]'::jsonb)
 from public.guild_members m join public.guilds g on g.id=m.guild_id where m.user_id=u;
$$;
revoke all on function private.guild_list(uuid) from public,anon,authenticated;

create function private.guild_command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; g public.guilds; new_code text; week_start timestamptz; board jsonb; tries integer:=0;
 alphabet constant text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
 u:=private.ensure_user();
 if action='list' then return jsonb_build_object('guilds',private.guild_list(u)); end if;
 if action='create' then
  if char_length(btrim(coalesce(payload->>'name','')))not between 1 and 40 then raise exception 'GUILD_NAME'; end if;
  if (select count(*) from public.guild_members where user_id=u)>=10 then raise exception 'GUILD_LIMIT'; end if;
  if (select count(*) from public.guilds where owner_id=u)>=5 then raise exception 'GUILD_OWNED_LIMIT'; end if;
  loop
   tries:=tries+1;
   select string_agg(substr(alphabet,1+floor(random()*32)::int,1),'') into new_code from generate_series(1,6);
   exit when not exists(select 1 from public.guilds where code=new_code);
   if tries>20 then raise exception 'GUILD_CODE'; end if;
  end loop;
  insert into public.guilds(name,code,owner_id) values(btrim(payload->>'name'),new_code,u) returning * into g;
  insert into public.guild_members(guild_id,user_id) values(g.id,u);
  return jsonb_build_object('guilds',private.guild_list(u),'id',g.id);
 end if;
 if action='join' then
  select * into g from public.guilds where code=upper(btrim(coalesce(payload->>'code','')));
  if not found then raise exception 'GUILD_NOT_FOUND'; end if;
  if not exists(select 1 from public.guild_members where guild_id=g.id and user_id=u) then
   if (select count(*) from public.guild_members where user_id=u)>=10 then raise exception 'GUILD_LIMIT'; end if;
   if (select count(*) from public.guild_members where guild_id=g.id)>=200 then raise exception 'GUILD_FULL'; end if;
   insert into public.guild_members(guild_id,user_id) values(g.id,u);
  end if;
  return jsonb_build_object('guilds',private.guild_list(u),'id',g.id);
 end if;
 -- The remaining actions name a guild the player belongs to.
 select g2.* into g from public.guilds g2 join public.guild_members m on m.guild_id=g2.id and m.user_id=u
  where g2.id::text=coalesce(payload->>'id','');
 if not found then raise exception 'GUILD_NOT_MEMBER'; end if;
 if action='leave' then
  delete from public.guild_members where guild_id=g.id and user_id=u;
  if g.owner_id=u then
   -- The longest-standing member inherits the guild; an empty guild is removed.
   update public.guilds set owner_id=(select user_id from public.guild_members where guild_id=g.id order by joined_at,user_id limit 1) where id=g.id
    and exists(select 1 from public.guild_members where guild_id=g.id);
   delete from public.guilds where id=g.id and not exists(select 1 from public.guild_members where guild_id=g.id);
  end if;
  return jsonb_build_object('guilds',private.guild_list(u));
 end if;
 if action='board' then
  -- Weeks start Monday 00:00 Bangkok time.
  week_start:=date_trunc('week',clock_timestamp() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok';
  select coalesce(jsonb_agg(r order by (r->>'weekXP')::bigint desc,(r->>'totalXP')::bigint desc,r->>'name'),'[]'::jsonb) into board from (
   select jsonb_build_object('name',p.character_name,'handle',case when p.is_public then p.handle end,
    'skinId',coalesce(up.equipped_skin_id,'swordsman'),'isMe',m.user_id=u,'isOwner',m.user_id=g.owner_id,
    'weekXP',private.xp_since(m.user_id,week_start),'totalXP',private.xp_since(m.user_id,'-infinity')) as r
   from public.guild_members m join public.profiles p on p.user_id=m.user_id left join public.user_progress up on up.user_id=m.user_id
   where m.guild_id=g.id) t;
  return jsonb_build_object('id',g.id,'name',g.name,'code',g.code,'isOwner',g.owner_id=u,
   'weekStart',floor(extract(epoch from week_start)*1000)::bigint,'members',board);
 end if;
 raise exception 'GUILD_ACTION';
end $$;
revoke all on function private.guild_command(text,jsonb) from public,anon,authenticated;
grant execute on function private.guild_command(text,jsonb) to authenticated;
create function public.liferpg_guild(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.guild_command(action,payload);$$;
revoke all on function public.liferpg_guild(text,jsonb) from public,anon;
grant execute on function public.liferpg_guild(text,jsonb) to authenticated;
