-- Additive LifeQuest adaptations. Original progress, reward ledger and focus remain intact.
create table public.career_catalog (id text primary key);
insert into public.career_catalog(id) values
('game_developer'),('software_developer'),('ui_ux_designer'),('english'),('programming'),('3d_modeling'),('public_speaking'),('fitness'),('healthy_lifestyle'),('save_money'),('read_more'),('travel_goal');
create table public.outfit_catalog(id text primary key, price integer not null check(price>=0));
insert into public.outfit_catalog values ('forest',0),('sunrise',30),('moonlight',45),('river',60);
alter table public.user_progress add column career_id text references public.career_catalog(id), add column equipped_outfit_id text not null default 'forest' references public.outfit_catalog(id);
create index user_progress_career_idx on public.user_progress(career_id);
create index user_progress_outfit_idx on public.user_progress(equipped_outfit_id);
create table public.outfit_purchases(
 user_id uuid not null references public.user_progress(user_id),
 item_id text not null references public.outfit_catalog(id),
 coins integer not null check(coins>0), purchased_at timestamptz not null default clock_timestamp(),
 primary key(user_id,item_id)
);
create index outfit_purchases_item_idx on public.outfit_purchases(item_id);
alter table public.career_catalog enable row level security;
alter table public.outfit_catalog enable row level security;
alter table public.outfit_purchases enable row level security;
revoke all on public.career_catalog,public.outfit_catalog,public.outfit_purchases from public,anon,authenticated;
grant select on public.career_catalog,public.outfit_catalog,public.outfit_purchases to authenticated;
create policy career_read on public.career_catalog for select to authenticated using(true);
create policy outfit_read on public.outfit_catalog for select to authenticated using(true);
create policy purchases_read on public.outfit_purchases for select to authenticated using((select auth.uid())=user_id);

-- Preserve the applied snapshot implementation; decorate its single snapshot with new fields.
alter function private.snapshot() rename to snapshot_core;
revoke all on function private.snapshot_core() from public,anon,authenticated;
create function private.snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; u uuid; p public.user_progress; purchases jsonb; spent bigint;
begin
 result:=private.snapshot_core();u:=auth.uid();
 select * into p from public.user_progress where user_id=u;
 select coalesce(sum(coins),0),coalesce(jsonb_object_agg(item_id,jsonb_build_object('itemId',item_id,'coins',coins,'purchasedAt',floor(extract(epoch from purchased_at)*1000)::bigint)),'{}'::jsonb) into spent,purchases from public.outfit_purchases where user_id=u;
 return jsonb_set(result,'{progress}',(result->'progress')||jsonb_build_object('version',4,'careerId',p.career_id,'equippedOutfitId',p.equipped_outfit_id,'purchases',purchases,'coins',(result#>>'{progress,coins}')::bigint-spent));
end $$;
revoke all on function private.snapshot() from public,anon,authenticated;
grant execute on function private.snapshot() to authenticated;
create or replace function public.liferpg_snapshot() returns jsonb language sql security invoker set search_path='' as $$ select private.snapshot(); $$;

create function private.growth_command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; item public.outfit_catalog; funds bigint; target text:=payload->>'itemId';
begin
 if action not in ('select_career','purchase','equip') then return private.command(action,payload);end if;
 u:=private.ensure_user(); -- locks latest user progress across all purchases/completions
 if action='select_career' then
  if not exists(select 1 from public.career_catalog where id=payload->>'careerId')then raise exception 'CAREER_INVALID';end if;
  update public.user_progress set career_id=payload->>'careerId',revision=revision+1 where user_id=u;
  return private.snapshot();
 end if;
 select * into item from public.outfit_catalog where id=target;
 if not found then raise exception 'ITEM_INVALID';end if;
 if action='purchase' then
  if item.price=0 or exists(select 1 from public.outfit_purchases where user_id=u and item_id=target)then return private.snapshot();end if;
  select (select coalesce(sum(coins),0) from public.reward_ledger where user_id=u)-(select coalesce(sum(coins),0) from public.outfit_purchases where user_id=u) into funds;
  if funds<item.price then raise exception 'COINS_INSUFFICIENT';end if;
  insert into public.outfit_purchases(user_id,item_id,coins)values(u,target,item.price);
 else
  if item.price>0 and not exists(select 1 from public.outfit_purchases where user_id=u and item_id=target)then raise exception 'ITEM_NOT_OWNED';end if;
  update public.user_progress set equipped_outfit_id=target where user_id=u;
 end if;
 update public.user_progress set revision=revision+1 where user_id=u;
 return private.snapshot();
end $$;
revoke all on function private.growth_command(text,jsonb) from public,anon,authenticated;
grant execute on function private.growth_command(text,jsonb) to authenticated;
create or replace function public.liferpg_command(action text,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.growth_command(action,payload);$$;

create table public.ai_usage(user_id uuid not null references public.user_progress(user_id),usage_day date not null,requests integer not null check(requests between 1 and 20),last_request_at timestamptz not null,primary key(user_id,usage_day));
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from public,anon,authenticated;
grant select on public.ai_usage to authenticated;
create policy ai_usage_read on public.ai_usage for select to authenticated using((select auth.uid())=user_id);
create function private.reserve_ai() returns void language plpgsql security definer set search_path='' as $$
declare u uuid; t timestamptz; d date; usage public.ai_usage;
begin
 u:=private.ensure_user();t:=clock_timestamp();d:=(t at time zone 'Asia/Bangkok')::date;
 select * into usage from public.ai_usage where user_id=u and usage_day=d;
 if found then
  if usage.requests>=20 or t-usage.last_request_at<interval '2 seconds' then raise exception 'AI_RATE_LIMIT';end if;
  update public.ai_usage set requests=requests+1,last_request_at=t where user_id=u and usage_day=d;
 else insert into public.ai_usage values(u,d,1,t);end if;
end $$;
create function public.liferpg_reserve_ai() returns void language sql security invoker set search_path='' as $$ select private.reserve_ai(); $$;
revoke all on function private.reserve_ai(),public.liferpg_reserve_ai() from public,anon,authenticated;
grant execute on function private.reserve_ai(),public.liferpg_reserve_ai() to authenticated;
