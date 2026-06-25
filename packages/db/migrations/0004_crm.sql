-- Campaign messages (individual sends)
create table public.campaign_messages (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  phone           text not null,
  message_body    text,
  status          text default 'pending' check (status in ('pending','sent','delivered','read','failed','skipped')),
  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  converted       boolean default false,
  created_at      timestamptz default now()
);

create index idx_campaign_messages_campaign on public.campaign_messages(campaign_id);
create index idx_campaign_messages_customer on public.campaign_messages(customer_id);

-- Automation rules
create table public.automation_rules (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  name            text not null,
  trigger_type    text not null check (trigger_type in ('first_order','inactive','cart_abandoned','birthday','milestone','negative_feedback','lead_nurture')),
  is_active       boolean default true,
  config          jsonb default '{}'::jsonb,
  template        text,
  delay_hours     integer default 0,
  created_at      timestamptz default now()
);

create index idx_automation_rules_restaurant on public.automation_rules(restaurant_id);

-- Automation logs
create table public.automation_logs (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  rule_id         uuid references public.automation_rules(id) on delete set null,
  customer_id     uuid references public.customers(id) on delete set null,
  action          text not null,
  status          text default 'executed',
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz default now()
);

-- Abandoned carts
create table public.abandoned_carts (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  customer_phone  text,
  items           jsonb default '[]'::jsonb,
  subtotal        numeric(10,2) default 0,
  notified        boolean default false,
  recovered       boolean default false,
  created_at      timestamptz default now()
);

create index idx_abandoned_carts_restaurant on public.abandoned_carts(restaurant_id);

-- RFM materialized view
create materialized view public.customer_rfm as
select
  c.id as customer_id,
  c.restaurant_id,
  c.segment,
  extract(day from now() - coalesce(c.last_order_at, c.created_at)) as recency_days,
  c.total_orders as frequency,
  c.total_spent as monetary,
  case
    when c.total_orders >= 10 and c.total_spent >= 500 then 'fidelizado'
    when c.total_orders >= 5 then 'promissor'
    when c.total_orders >= 2 then 'candidato'
    when c.total_orders >= 1 then 'novato'
    when extract(day from now() - coalesce(c.last_order_at, c.created_at)) > 60 then 'perdido'
    when extract(day from now() - coalesce(c.last_order_at, c.created_at)) > 30 then 'inativo'
    else 'novato'
  end as calculated_segment
from public.customers c;

create unique index idx_rfm_customer on public.customer_rfm(customer_id);

-- Enable RLS
alter table public.campaign_messages enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_logs enable row level security;
alter table public.abandoned_carts enable row level security;

-- Policies
do $$ declare t text;
begin for t in select unnest(array['campaign_messages','automation_rules','automation_logs','abandoned_carts'])
loop
  execute format('create policy "tenant_select_%1$s" on public.%1$I for select using (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_insert_%1$s" on public.%1$I for insert with check (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_update_%1$s" on public.%1$I for update using (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_delete_%1$s" on public.%1$I for delete using (restaurant_id in (select public.user_restaurant_ids()))', t);
end loop; end; $$;

-- Function to refresh RFM view (called by cron)
create or replace function public.refresh_rfm() returns void as $$
begin
  refresh materialized view concurrently public.customer_rfm;
end;
$$ language plpgsql security definer;

-- Function to sync segments from RFM
create or replace function public.sync_segments() returns integer as $$
declare updated integer;
begin
  update public.customers c
  set segment = r.calculated_segment, updated_at = now()
  from public.customer_rfm r
  where c.id = r.customer_id
  and c.segment != r.calculated_segment;

  get diagnostics updated = row_count;
  return updated;
end;
$$ language plpgsql security definer;
