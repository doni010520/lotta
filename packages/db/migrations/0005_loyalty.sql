-- Loyalty transactions (credits, debits, expirations)
create table public.loyalty_transactions (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  type            text not null check (type in ('credit','debit','expiration','adjustment')),
  amount          numeric(12,2) not null,
  balance_after   numeric(12,2) not null,
  reason          text,
  reference_type  text check (reference_type in ('order','campaign','coupon','manual','expiration')),
  reference_id    uuid,
  expires_at      timestamptz,
  created_at      timestamptz default now()
);

create index idx_loyalty_tx_customer on public.loyalty_transactions(customer_id);
create index idx_loyalty_tx_restaurant on public.loyalty_transactions(restaurant_id);
create index idx_loyalty_tx_expires on public.loyalty_transactions(expires_at) where expires_at is not null and type = 'credit';

-- Coupon usages
create table public.coupon_usages (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  coupon_id       uuid not null references public.coupons(id) on delete cascade,
  customer_id     uuid references public.customers(id) on delete set null,
  order_id        uuid references public.orders(id) on delete set null,
  discount_applied numeric(10,2) not null default 0,
  created_at      timestamptz default now()
);

create index idx_coupon_usages_coupon on public.coupon_usages(coupon_id);

-- Add expiry config to loyalty_programs
alter table public.loyalty_programs
  add column if not exists points_expire_days integer default 180,
  add column if not exists min_redeem numeric(10,2) default 0,
  add column if not exists rewards jsonb default '[]'::jsonb;

-- RLS
alter table public.loyalty_transactions enable row level security;
alter table public.coupon_usages enable row level security;

do $$ declare t text;
begin for t in select unnest(array['loyalty_transactions','coupon_usages'])
loop
  execute format('create policy "tenant_select_%1$s" on public.%1$I for select using (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_insert_%1$s" on public.%1$I for insert with check (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_update_%1$s" on public.%1$I for update using (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_delete_%1$s" on public.%1$I for delete using (restaurant_id in (select public.user_restaurant_ids()))', t);
end loop; end; $$;

-- Function: credit loyalty after confirmed order
create or replace function public.credit_loyalty(
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_order_id uuid,
  p_order_total numeric
) returns numeric as $$
declare
  v_program public.loyalty_programs%rowtype;
  v_credit numeric;
  v_balance numeric;
  v_expires timestamptz;
begin
  select * into v_program from public.loyalty_programs
    where restaurant_id = p_restaurant_id and is_active = true limit 1;

  if not found then return 0; end if;

  if v_program.type = 'points' then
    v_credit := floor(p_order_total * v_program.points_per_real);
  else
    v_credit := round(p_order_total * v_program.cashback_pct / 100, 2);
  end if;

  if v_credit <= 0 then return 0; end if;

  -- Get or create balance
  insert into public.loyalty_balances (restaurant_id, customer_id, balance)
  values (p_restaurant_id, p_customer_id, 0)
  on conflict (restaurant_id, customer_id) do nothing;

  update public.loyalty_balances
  set balance = balance + v_credit, updated_at = now()
  where restaurant_id = p_restaurant_id and customer_id = p_customer_id
  returning balance into v_balance;

  -- Expiry
  if v_program.points_expire_days > 0 then
    v_expires := now() + (v_program.points_expire_days || ' days')::interval;
  end if;

  -- Log transaction
  insert into public.loyalty_transactions (restaurant_id, customer_id, type, amount, balance_after, reason, reference_type, reference_id, expires_at)
  values (p_restaurant_id, p_customer_id, 'credit', v_credit, v_balance,
    case when v_program.type = 'points' then 'Pontos pelo pedido' else 'Cashback pelo pedido' end,
    'order', p_order_id, v_expires);

  return v_credit;
end;
$$ language plpgsql security definer;

-- Function: redeem loyalty
create or replace function public.redeem_loyalty(
  p_restaurant_id uuid,
  p_customer_id uuid,
  p_amount numeric,
  p_order_id uuid default null
) returns boolean as $$
declare
  v_balance numeric;
begin
  select balance into v_balance from public.loyalty_balances
    where restaurant_id = p_restaurant_id and customer_id = p_customer_id;

  if v_balance is null or v_balance < p_amount then return false; end if;

  update public.loyalty_balances
  set balance = balance - p_amount, updated_at = now()
  where restaurant_id = p_restaurant_id and customer_id = p_customer_id;

  insert into public.loyalty_transactions (restaurant_id, customer_id, type, amount, balance_after, reason, reference_type, reference_id)
  values (p_restaurant_id, p_customer_id, 'debit', -p_amount, v_balance - p_amount, 'Resgate', 'order', p_order_id);

  return true;
end;
$$ language plpgsql security definer;

-- Function: validate coupon
create or replace function public.validate_coupon(
  p_restaurant_id uuid,
  p_code text,
  p_subtotal numeric,
  p_customer_id uuid default null
) returns jsonb as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount numeric;
  v_usage_count integer;
begin
  select * into v_coupon from public.coupons
    where restaurant_id = p_restaurant_id and code = upper(p_code) and is_active = true;

  if not found then return jsonb_build_object('valid', false, 'error', 'Cupom não encontrado'); end if;
  if v_coupon.valid_until is not null and v_coupon.valid_until < now() then return jsonb_build_object('valid', false, 'error', 'Cupom expirado'); end if;
  if p_subtotal < v_coupon.min_order then return jsonb_build_object('valid', false, 'error', format('Pedido mínimo: R$ %s', v_coupon.min_order)); end if;

  if v_coupon.max_uses is not null then
    select count(*) into v_usage_count from public.coupon_usages where coupon_id = v_coupon.id;
    if v_usage_count >= v_coupon.max_uses then return jsonb_build_object('valid', false, 'error', 'Cupom esgotado'); end if;
  end if;

  -- Check per-customer usage (1 use per customer)
  if p_customer_id is not null then
    select count(*) into v_usage_count from public.coupon_usages
      where coupon_id = v_coupon.id and customer_id = p_customer_id;
    if v_usage_count > 0 then return jsonb_build_object('valid', false, 'error', 'Cupom já utilizado'); end if;
  end if;

  -- Calculate discount
  case v_coupon.type
    when 'percent' then v_discount := round(p_subtotal * v_coupon.value / 100, 2);
    when 'fixed' then v_discount := least(v_coupon.value, p_subtotal);
    when 'free_delivery' then v_discount := 0; -- handled at checkout
  end case;

  return jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'type', v_coupon.type,
    'value', v_coupon.value,
    'discount', v_discount
  );
end;
$$ language plpgsql security definer;
