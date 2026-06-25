-- P1-7: order_number per restaurant (not global serial)
-- Drop the serial column and replace with a trigger-based sequence

-- Function to get next order number for a restaurant
create or replace function public.next_order_number(p_restaurant_id uuid)
returns integer as $$
declare v_num integer;
begin
  select coalesce(max(order_number), 0) + 1 into v_num
  from public.orders
  where restaurant_id = p_restaurant_id;
  return v_num;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Trigger to auto-set order_number before insert
create or replace function public.set_order_number()
returns trigger as $$
begin
  if new.order_number is null or new.order_number = 0 then
    new.order_number := public.next_order_number(new.restaurant_id);
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

create trigger trg_order_number
  before insert on public.orders
  for each row execute function public.set_order_number();

-- P1-8: Prevent duplicate invoices
alter table public.billing_invoices
  add constraint uq_billing_period unique (restaurant_id, period_start);

-- Update generate_monthly_invoice to use ON CONFLICT
create or replace function public.generate_monthly_invoice(p_restaurant_id uuid, p_month date)
returns uuid as $$
declare
  v_start date; v_end date; v_revenue numeric; v_rate numeric := 4.0; v_amount numeric; v_id uuid;
begin
  v_start := date_trunc('month', p_month)::date;
  v_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;

  select coalesce(sum(total), 0) into v_revenue from public.orders
  where restaurant_id = p_restaurant_id and status = 'delivered'
    and created_at >= v_start and created_at <= v_end + interval '1 day';

  v_amount := round(v_revenue * v_rate / 100, 2);

  insert into public.billing_invoices (restaurant_id, period_start, period_end, revenue_reported, rate_pct, amount_due, due_date)
  values (p_restaurant_id, v_start, v_end, v_revenue, v_rate, v_amount, v_end + interval '10 days')
  on conflict (restaurant_id, period_start) do nothing
  returning id into v_id;

  return v_id;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- P1-10: billing_invoices — restrict INSERT to service role only
drop policy if exists "tenant_insert_billing" on public.billing_invoices;
-- (INSERT now only via service role / SQL functions)

-- P1-11: Add search_path to ALL security definer functions
-- (retroactive fix — new functions above already have it)
do $$
declare
  fn record;
begin
  for fn in
    select p.proname, n.nspname
    from pg_proc p join pg_namespace n on p.pronamespace = n.oid
    where n.nspname = 'public'
      and p.prosecdef = true
      and p.proconfig is null  -- no search_path set
  loop
    execute format(
      'alter function %I.%I set search_path = public, pg_temp',
      fn.nspname, fn.proname
    );
  end loop;
end;
$$;
