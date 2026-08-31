alter table public.pos_plan_limits
  add column if not exists marketplace_product_limit integer not null default 1000;

update public.pos_plan_limits
set marketplace_product_limit = case when plan_code='community_free' then 20 else product_limit end,
    updated_at = now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname='pos_plan_limits_marketplace_product_limit_check') then
    alter table public.pos_plan_limits
      add constraint pos_plan_limits_marketplace_product_limit_check check (marketplace_product_limit >= 0);
  end if;
end $$;

alter table public.pos_orders
  add column if not exists buyer_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_pos_orders_buyer_user_id
  on public.pos_orders(buyer_user_id) where buyer_user_id is not null;

create or replace function public.pos_effective_plan_code(p_merchant_id uuid)
returns text
language sql
stable
security definer
set search_path='public'
as $$
  select case
    when m.plan_code='community_free' then 'community_free'
    when exists (
      select 1 from public.pos_subscriptions s
      where s.merchant_id=m.id
        and s.plan_code=m.plan_code
        and s.status in ('active','trialing','grace')
        and (s.current_period_end is null or s.current_period_end > now() or (s.status='grace' and s.grace_until > now()))
    ) then m.plan_code
    else 'community_free'
  end
  from public.pos_merchants m
  where m.id=p_merchant_id;
$$;

revoke all on function public.pos_effective_plan_code(uuid) from public, anon;
grant execute on function public.pos_effective_plan_code(uuid) to authenticated, service_role;

create or replace function public.pos_my_contexts()
returns table(merchant_id uuid, merchant_name text, merchant_slug text, merchant_status text, eligibility_status text, plan_code text, role text, outlet_id uuid, outlet_name text)
language sql
stable
security definer
set search_path='public','auth'
as $$
 select m.id,m.name,m.slug,m.status,m.eligibility_status,public.pos_effective_plan_code(m.id),pm.role,o.id,o.name
 from public.pos_memberships pm
 join public.pos_merchants m on m.id=pm.merchant_id
 left join public.pos_outlets o on o.merchant_id=m.id and o.archived_at is null and o.active
 where pm.user_id=(select auth.uid()) and pm.status='active'
 order by m.created_at,o.created_at;
$$;

create or replace function public.pos_enforce_plan_limit()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.merchant_id::text || ':' || tg_table_name, 0));
  v_plan := public.pos_effective_plan_code(new.merchant_id);
  if v_plan is null then raise exception 'Unknown merchant'; end if;

  if tg_table_name = 'pos_products' then
    if new.archived_at is not null then return new; end if;
    select product_limit into v_limit from public.pos_plan_limits where plan_code = v_plan;
    select count(*) into v_count from public.pos_products where merchant_id = new.merchant_id and archived_at is null and id <> new.id;
  elsif tg_table_name = 'pos_categories' then
    if new.archived_at is not null then return new; end if;
    select category_limit into v_limit from public.pos_plan_limits where plan_code = v_plan;
    select count(*) into v_count from public.pos_categories where merchant_id = new.merchant_id and archived_at is null and id <> new.id;
  elsif tg_table_name = 'pos_outlets' then
    if new.archived_at is not null then return new; end if;
    select outlet_limit into v_limit from public.pos_plan_limits where plan_code = v_plan;
    select count(*) into v_count from public.pos_outlets where merchant_id = new.merchant_id and archived_at is null and id <> new.id;
  elsif tg_table_name = 'pos_memberships' then
    if new.status <> 'active' or new.role = 'owner' then return new; end if;
    select staff_limit into v_limit from public.pos_plan_limits where plan_code = v_plan;
    select count(*) into v_count from public.pos_memberships where merchant_id = new.merchant_id and status = 'active' and role <> 'owner' and user_id <> new.user_id;
  else
    return new;
  end if;

  if v_limit is null then raise exception 'Plan limit unavailable'; end if;
  if v_count >= v_limit then
    raise exception 'Plan limit reached for %: maximum %', tg_table_name, v_limit using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.pos_enforce_modifier_limit()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_limit integer;
  v_count integer;
  v_plan text;
begin
  if new.archived_at is not null then return new; end if;
  v_plan := public.pos_effective_plan_code(new.merchant_id);
  if v_plan is null then raise exception 'Merchant unavailable'; end if;

  if tg_table_name = 'pos_modifier_groups' then
    perform pg_advisory_xact_lock(hashtextextended(new.product_id::text || ':pos_modifier_groups', 0));
    select modifier_groups_per_product into v_limit from public.pos_plan_limits where plan_code = v_plan;
    if v_limit is null then raise exception 'Plan modifier limit unavailable'; end if;
    select count(*) into v_count from public.pos_modifier_groups where merchant_id = new.merchant_id and product_id = new.product_id and archived_at is null and id <> new.id;
  elsif tg_table_name = 'pos_modifier_options' then
    perform pg_advisory_xact_lock(hashtextextended(new.group_id::text || ':pos_modifier_options', 0));
    select modifier_options_per_group into v_limit from public.pos_plan_limits where plan_code = v_plan;
    if v_limit is null then raise exception 'Plan modifier limit unavailable'; end if;
    select count(*) into v_count from public.pos_modifier_options where merchant_id = new.merchant_id and group_id = new.group_id and archived_at is null and id <> new.id;
  else
    raise exception 'Unsupported modifier limit trigger table';
  end if;

  if v_count >= v_limit then raise exception 'Modifier limit reached: maximum %', v_limit using errcode = 'check_violation'; end if;
  return new;
end;
$$;

create or replace function public.pos_enforce_marketplace_publish_limit()
returns trigger
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_plan text;
  v_limit integer;
  v_count integer;
begin
  if not coalesce(new.marketplace_published,false) then return new; end if;
  if tg_op='UPDATE' and coalesce(old.marketplace_published,false) then return new; end if;
  if new.archived_at is not null then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended(new.merchant_id::text || ':marketplace-products', 0));
  v_plan := public.pos_effective_plan_code(new.merchant_id);
  select marketplace_product_limit into v_limit from public.pos_plan_limits where plan_code=v_plan;
  if v_limit is null then raise exception 'Marketplace product limit unavailable'; end if;

  select count(*) into v_count
  from public.pos_products
  where merchant_id=new.merchant_id and archived_at is null and marketplace_published and id <> new.id;

  if v_count >= v_limit then
    raise exception 'Marketplace product limit reached: maximum %', v_limit using errcode='check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pos_marketplace_publish_limit on public.pos_products;
create trigger trg_pos_marketplace_publish_limit
before insert or update of marketplace_published on public.pos_products
for each row execute function public.pos_enforce_marketplace_publish_limit();

create or replace function public.pos_attach_buyer_to_order_internal(p_tracking_token uuid, p_buyer_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare v_order public.pos_orders%rowtype;
begin
  if p_buyer_user_id is null then raise exception 'Buyer account required'; end if;
  select * into v_order from public.pos_orders where tracking_token=p_tracking_token for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.buyer_user_id is null then
    update public.pos_orders set buyer_user_id=p_buyer_user_id,updated_at=now() where id=v_order.id;
  elsif v_order.buyer_user_id <> p_buyer_user_id then
    raise exception 'Order belongs to another buyer account' using errcode='42501';
  end if;
  return v_order.id;
end;
$$;

create or replace function public.pos_buyer_message_internal(p_tracking_token uuid, p_buyer_user_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
declare
  v_order public.pos_orders%rowtype;
  v_id uuid;
begin
  if p_buyer_user_id is null then raise exception 'Buyer account required'; end if;
  if p_message is null or length(trim(p_message))=0 or length(trim(p_message))>1000 then raise exception 'Invalid message'; end if;
  select * into v_order from public.pos_orders where tracking_token=p_tracking_token for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.status in ('completed','cancelled') then raise exception 'Chat closed'; end if;

  if v_order.buyer_user_id is null then
    update public.pos_orders set buyer_user_id=p_buyer_user_id,updated_at=now() where id=v_order.id;
  elsif v_order.buyer_user_id <> p_buyer_user_id then
    raise exception 'Order belongs to another buyer account' using errcode='42501';
  end if;

  insert into public.pos_chat_messages(order_id,merchant_id,sender_type,sender_user_id,message)
  values(v_order.id,v_order.merchant_id,'customer',p_buyer_user_id,trim(p_message))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.pos_guest_message_internal(p_tracking_token uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path='public'
as $$
begin
  raise exception 'Buyer account required' using errcode='42501';
end;
$$;

create or replace function public.pos_guest_tracking_internal(p_tracking_token uuid)
returns jsonb
language sql
stable
security definer
set search_path='public'
as $$
  select jsonb_build_object(
    'order_number',o.order_number,'customer_name',o.customer_name,'fulfillment',o.fulfillment,'table_label',o.table_label,
    'status',o.status,'payment_status',o.payment_status,'total',o.total,'created_at',o.created_at,'updated_at',o.updated_at,
    'chat_available',false,'chat_account_required',true,'chat_account_mismatch',false,'messages','[]'::jsonb
  )
  from public.pos_orders o where o.tracking_token=p_tracking_token limit 1;
$$;

create or replace function public.pos_buyer_tracking_internal(p_tracking_token uuid, p_buyer_user_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path='public'
as $$
  select jsonb_build_object(
    'order_number',o.order_number,'customer_name',o.customer_name,'fulfillment',o.fulfillment,'table_label',o.table_label,
    'status',o.status,'payment_status',o.payment_status,'total',o.total,'created_at',o.created_at,'updated_at',o.updated_at,
    'chat_available',(p_buyer_user_id is not null and (o.buyer_user_id is null or o.buyer_user_id=p_buyer_user_id) and o.status not in ('completed','cancelled')),
    'chat_account_required',(p_buyer_user_id is null),
    'chat_account_mismatch',(p_buyer_user_id is not null and o.buyer_user_id is not null and o.buyer_user_id<>p_buyer_user_id),
    'messages',case when p_buyer_user_id is not null and o.buyer_user_id=p_buyer_user_id then coalesce((
      select jsonb_agg(jsonb_build_object('sender_type',cm.sender_type,'message',cm.message,'created_at',cm.created_at) order by cm.created_at)
      from public.pos_chat_messages cm where cm.order_id=o.id
    ),'[]'::jsonb) else '[]'::jsonb end
  )
  from public.pos_orders o where o.tracking_token=p_tracking_token limit 1;
$$;

revoke all on function public.pos_attach_buyer_to_order_internal(uuid,uuid) from public, anon, authenticated;
revoke all on function public.pos_buyer_message_internal(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.pos_buyer_tracking_internal(uuid,uuid) from public, anon, authenticated;
revoke all on function public.pos_guest_message_internal(uuid,text) from public, anon, authenticated;
revoke all on function public.pos_guest_tracking_internal(uuid) from public, anon, authenticated;
grant execute on function public.pos_attach_buyer_to_order_internal(uuid,uuid) to service_role;
grant execute on function public.pos_buyer_message_internal(uuid,uuid,text) to service_role;
grant execute on function public.pos_buyer_tracking_internal(uuid,uuid) to service_role;
grant execute on function public.pos_guest_message_internal(uuid,text) to service_role;
grant execute on function public.pos_guest_tracking_internal(uuid) to service_role;

drop policy if exists pos_chat_staff_insert on public.pos_chat_messages;
create policy pos_chat_staff_insert on public.pos_chat_messages
for insert to authenticated
with check (
  public.pos_is_member(merchant_id)
  and sender_type='staff'
  and sender_user_id=(select auth.uid())
  and exists (
    select 1 from public.pos_orders o
    where o.id=pos_chat_messages.order_id
      and o.merchant_id=pos_chat_messages.merchant_id
      and o.buyer_user_id is not null
      and o.status not in ('completed','cancelled')
  )
);
