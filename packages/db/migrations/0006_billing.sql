-- Billing: SaaS subscription for restaurants
create table public.billing_invoices (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  revenue_reported numeric(12,2) default 0,
  rate_pct        numeric(5,2) default 4.0,
  amount_due      numeric(10,2) not null,
  status          text default 'pending' check (status in ('pending','paid','overdue','cancelled')),
  payment_method  text,
  payment_id      text,
  paid_at         timestamptz,
  due_date        date not null,
  created_at      timestamptz default now()
);

create index idx_billing_restaurant on public.billing_invoices(restaurant_id);
alter table public.billing_invoices enable row level security;

create policy "tenant_select_billing" on public.billing_invoices for select using (restaurant_id in (select public.user_restaurant_ids()));
create policy "tenant_insert_billing" on public.billing_invoices for insert with check (restaurant_id in (select public.user_restaurant_ids()));

-- Restaurant networks (multi-unit)
create table public.restaurant_networks (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner_id    uuid references public.users(id),
  created_at  timestamptz default now()
);

alter table public.restaurants add column if not exists network_id uuid references public.restaurant_networks(id);
create index idx_restaurants_network on public.restaurants(network_id) where network_id is not null;

-- Function: calculate monthly invoice
create or replace function public.generate_monthly_invoice(p_restaurant_id uuid, p_month date)
returns uuid as $$
declare
  v_start date;
  v_end date;
  v_revenue numeric;
  v_rate numeric := 4.0;
  v_amount numeric;
  v_invoice_id uuid;
begin
  v_start := date_trunc('month', p_month)::date;
  v_end := (date_trunc('month', p_month) + interval '1 month' - interval '1 day')::date;

  select coalesce(sum(total), 0) into v_revenue
  from public.orders
  where restaurant_id = p_restaurant_id
    and status = 'delivered'
    and created_at >= v_start and created_at <= v_end + interval '1 day';

  v_amount := round(v_revenue * v_rate / 100, 2);

  insert into public.billing_invoices (restaurant_id, period_start, period_end, revenue_reported, rate_pct, amount_due, due_date)
  values (p_restaurant_id, v_start, v_end, v_revenue, v_rate, v_amount, v_end + interval '10 days')
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$ language plpgsql security definer;
