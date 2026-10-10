-- Additive daily career practice. Quest ledger, purchases and existing progress are untouched.
create table public.career_tasks(career_id text not null references public.career_catalog(id),id text not null,primary key(career_id,id));
insert into public.career_tasks(career_id,id) values
('game_developer','learn_cpp'),
('game_developer','practice_unreal'),
('game_developer','practice_3d_modeling'),
('game_developer','programming_challenge'),
('game_developer','mini_game_project'),
('software_developer','study_programming'),
('software_developer','practice_algorithms'),
('software_developer','practice_git'),
('software_developer','coding_challenge'),
('software_developer','build_mini_app'),
('ui_ux_designer','practice_figma'),
('ui_ux_designer','study_ui_ux'),
('ui_ux_designer','design_one_screen'),
('ui_ux_designer','analyze_app_ui'),
('ui_ux_designer','mini_design_project'),
('english','vocabulary_practice'),
('english','english_listening'),
('english','english_speaking'),
('english','english_reading'),
('english','real_conversation'),
('programming','study_programming'),
('programming','coding_problems'),
('programming','read_documentation'),
('programming','build_without_copying'),
('programming','mini_project'),
('3d_modeling','learn_blender_tools'),
('3d_modeling','model_an_object'),
('3d_modeling','practice_materials'),
('3d_modeling','complete_3d_model'),
('public_speaking','mirror_speaking'),
('public_speaking','random_topic'),
('public_speaking','record_speaking'),
('public_speaking','present_to_person'),
('fitness','walk_or_run'),
('fitness','strength_training'),
('fitness','stretching'),
('fitness','weekly_workout_challenge'),
('healthy_lifestyle','walk_run_30'),
('healthy_lifestyle','strength_training'),
('healthy_lifestyle','healthy_food_day'),
('healthy_lifestyle','weekly_planned_routine'),
('save_money','record_finances'),
('save_money','avoid_unnecessary_purchase'),
('save_money','weekly_savings_goal'),
('save_money','monthly_savings_goal'),
('read_more','read_20_minutes'),
('read_more','read_30_pages'),
('read_more','write_summary'),
('read_more','finish_book'),
('travel_goal','research_destination'),
('travel_goal','create_trip_budget'),
('travel_goal','create_itinerary'),
('travel_goal','save_for_trip'),
('travel_goal','complete_trip');
create table public.practice_log(
 user_id uuid not null references public.user_progress(user_id) on delete cascade,
 practice_day date not null, career_id text not null, task_id text not null,
 completed_at timestamptz not null, xp integer not null check(xp=10), coins integer not null check(coins=5),
 primary key(user_id,practice_day,career_id,task_id),
 foreign key(career_id,task_id) references public.career_tasks(career_id,id)
);
create index practice_log_task_idx on public.practice_log(career_id,task_id);
alter table public.career_tasks enable row level security;
alter table public.practice_log enable row level security;
revoke all on public.career_tasks,public.practice_log from public,anon,authenticated;
grant select on public.career_tasks,public.practice_log to authenticated;
create policy career_tasks_read on public.career_tasks for select to authenticated using(true);
create policy practice_log_read on public.practice_log for select to authenticated using((select auth.uid())=user_id);

-- Practice rewards join the ledger totals in the snapshot only; quest totalXPBefore keeps ledger-only semantics.
alter function private.snapshot() rename to snapshot_boss;
revoke all on function private.snapshot_boss() from public,anon,authenticated;
create function private.snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;u uuid;practice jsonb;px bigint;pc bigint;
begin
 result:=private.snapshot_boss();u:=auth.uid();
 select coalesce(sum(xp),0),coalesce(sum(coins),0),coalesce(jsonb_object_agg(to_char(practice_day,'YYYY-MM-DD')||'|'||career_id||'|'||task_id,jsonb_build_object('careerId',career_id,'taskId',task_id,'day',to_char(practice_day,'YYYY-MM-DD'),'completedAt',floor(extract(epoch from completed_at)*1000)::bigint,'xp',xp,'coins',coins)),'{}'::jsonb)
  into px,pc,practice from public.practice_log where user_id=u;
 return jsonb_set(result,'{progress}',(result->'progress')||jsonb_build_object('version',6,'practice',practice,'totalXP',(result#>>'{progress,totalXP}')::bigint+px,'coins',(result#>>'{progress,coins}')::bigint+pc));
end $$;
revoke all on function private.snapshot() from public,anon,authenticated;
grant execute on function private.snapshot() to authenticated;

alter function private.growth_command(text,jsonb) rename to growth_core;
revoke all on function private.growth_core(text,jsonb) from public,anon,authenticated;
create function private.growth_command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;item public.outfit_catalog;funds bigint;c text;t timestamptz;d date;task text:=payload->>'taskId';
begin
 if action not in ('practice','purchase') then return private.growth_core(action,payload);end if;
 u:=private.ensure_user(); -- row lock serialises the daily limit and spending
 if action='purchase' then
  select * into item from public.outfit_catalog where id=payload->>'itemId';
  if not found then raise exception 'ITEM_INVALID';end if;
  if item.price=0 or exists(select 1 from public.outfit_purchases where user_id=u and item_id=item.id)then return private.snapshot();end if;
  funds:=(select coalesce(sum(coins),0) from public.reward_ledger where user_id=u)+(select coalesce(sum(coins),0) from public.practice_log where user_id=u)-(select coalesce(sum(coins),0) from public.outfit_purchases where user_id=u);
  if funds<item.price then raise exception 'COINS_INSUFFICIENT';end if;
  insert into public.outfit_purchases(user_id,item_id,coins)values(u,item.id,item.price);
 else
  select career_id into c from public.user_progress where user_id=u;
  if c is null then raise exception 'PRACTICE_CAREER_REQUIRED';end if;
  if not exists(select 1 from public.career_tasks where career_id=c and id=task)then raise exception 'PRACTICE_TASK_INVALID';end if;
  t:=clock_timestamp();d:=(t at time zone 'Asia/Bangkok')::date;
  if exists(select 1 from public.practice_log where user_id=u and practice_day=d and career_id=c and task_id=task)then return private.snapshot();end if;
  if (select count(*) from public.practice_log where user_id=u and practice_day=d)>=3 then raise exception 'PRACTICE_LIMIT';end if;
  insert into public.practice_log(user_id,practice_day,career_id,task_id,completed_at,xp,coins)values(u,d,c,task,t,10,5);
 end if;
 update public.user_progress set revision=revision+1 where user_id=u;
 return private.snapshot();
end $$;
revoke all on function private.growth_command(text,jsonb) from public,anon,authenticated;
grant execute on function private.growth_command(text,jsonb) to authenticated;
