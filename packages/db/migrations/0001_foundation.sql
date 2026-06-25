-- Migration 0001: Foundation schema
-- Multi-tenant delivery platform with RLS

-- ══════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ══════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ══════════════════════════════════════════════════════════════════════
-- CORE: restaurants + users
-- ══════════════════════════════════════════════════════════════════════

create table public.restaurants (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  logo_url      text,
  phone         text,
  email         text,
  document      text,                -- CNPJ
  address       jsonb default '{}'::jsonb,  -- {street, number, complement, neighborhood, city, state, zip, lat, lng}
  timezone      text default 'America/Sao_Paulo',
  currency      text default 'BRL',
  is_open       boolean default false,
  auto_accept   boolean default false,
  min_order     numeric(10,2) default 0,
  avg_prep_time integer default 30,  -- minutos
  status        text default 'active' check (status in ('active','suspended','trial','cancelled')),
  trial_ends_at timestamptz,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_restaurants_slug on public.restaurants(slug);

create table public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  avatar_url      text,
  phone           text,
  is_superadmin   boolean default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table public.restaurant_users (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  role          text not null default 'operator' check (role in ('owner','manager','operator','viewer')),
  created_at    timestamptz default now(),
  unique(restaurant_id, user_id)
);

create index idx_restaurant_users_restaurant on public.restaurant_users(restaurant_id);
create index idx_restaurant_users_user on public.restaurant_users(user_id);

-- ══════════════════════════════════════════════════════════════════════
-- CATALOG: categories + products + options
-- ══════════════════════════════════════════════════════════════════════

create table public.categories (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  description   text,
  sort_order    integer default 0,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_categories_restaurant on public.categories(restaurant_id);

create table public.products (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id   uuid references public.categories(id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(10,2) not null,
  promo_price   numeric(10,2),
  image_url     text,
  is_active     boolean default true,
  sort_order    integer default 0,
  prep_time     integer,             -- minutos (override do restaurante)
  serves        integer default 1,   -- serve X pessoas
  tags          text[] default '{}', -- ex: {'vegano','sem glúten'}
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_products_restaurant on public.products(restaurant_id);
create index idx_products_category on public.products(category_id);

create table public.option_groups (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  name          text not null,        -- ex: "Tamanho", "Adicionais", "Borda"
  min_select    integer default 0,    -- mín. de opções que o cliente deve selecionar
  max_select    integer default 1,    -- máx. de opções
  is_required   boolean default false,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

create index idx_option_groups_product on public.option_groups(product_id);

create table public.options (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  option_group_id uuid not null references public.option_groups(id) on delete cascade,
  name            text not null,
  price           numeric(10,2) default 0,
  is_active       boolean default true,
  sort_order      integer default 0,
  created_at      timestamptz default now()
);

create index idx_options_group on public.options(option_group_id);

-- ══════════════════════════════════════════════════════════════════════
-- CUSTOMERS
-- ══════════════════════════════════════════════════════════════════════

create table public.customers (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text,
  phone         text not null,
  email         text,
  document      text,                 -- CPF
  birthday      date,
  source        text default 'organic' check (source in ('organic','ifood','99food','whatsapp','ads','import')),
  segment       text default 'novato' check (segment in ('novato','candidato','promissor','fidelizado','inativo','perdido')),
  consent_marketing boolean default false,
  total_orders  integer default 0,
  total_spent   numeric(12,2) default 0,
  last_order_at timestamptz,
  first_order_at timestamptz,
  tags          text[] default '{}',
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(restaurant_id, phone)
);

create index idx_customers_restaurant on public.customers(restaurant_id);
create index idx_customers_phone on public.customers(phone);
create index idx_customers_segment on public.customers(restaurant_id, segment);

create table public.customer_addresses (
  id            uuid primary key default uuid_generate_v4(),
  customer_id   uuid not null references public.customers(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  label         text default 'Casa',
  street        text,
  number        text,
  complement    text,
  neighborhood  text,
  city          text,
  state         text,
  zip           text,
  lat           numeric(10,7),
  lng           numeric(10,7),
  is_default    boolean default false,
  created_at    timestamptz default now()
);

create index idx_customer_addresses_customer on public.customer_addresses(customer_id);

-- ══════════════════════════════════════════════════════════════════════
-- ORDERS
-- ══════════════════════════════════════════════════════════════════════

create table public.orders (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  customer_id     uuid references public.customers(id) on delete set null,
  order_number    serial,
  channel         text not null default 'cardapio' check (channel in ('cardapio','whatsapp','ifood','99food')),
  status          text not null default 'pending' check (status in ('pending','confirmed','preparing','ready','dispatched','delivered','cancelled')),
  payment_method  text check (payment_method in ('pix','credit_card','debit_card','cash','card_on_delivery')),
  payment_status  text default 'pending' check (payment_status in ('pending','paid','refunded','failed')),
  payment_gateway_id text,            -- id da transação no gateway do restaurante
  subtotal        numeric(10,2) not null default 0,
  delivery_fee    numeric(10,2) default 0,
  discount        numeric(10,2) default 0,
  total           numeric(10,2) not null default 0,
  delivery_address jsonb,
  customer_name   text,
  customer_phone  text,
  notes           text,
  coupon_code     text,
  scheduled_for   timestamptz,        -- agendamento de pedido
  estimated_prep  integer,            -- minutos
  estimated_delivery integer,         -- minutos
  external_id     text,               -- id no iFood/99Food
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index idx_orders_restaurant on public.orders(restaurant_id);
create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_status on public.orders(restaurant_id, status);
create index idx_orders_channel on public.orders(restaurant_id, channel);
create index idx_orders_created on public.orders(restaurant_id, created_at desc);

create table public.order_items (
  id              uuid primary key default uuid_generate_v4(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,       -- snapshot no momento do pedido
  quantity        integer not null default 1,
  unit_price      numeric(10,2) not null,
  total_price     numeric(10,2) not null,
  options         jsonb default '[]'::jsonb,  -- [{group_name, option_name, price}]
  notes           text,
  created_at      timestamptz default now()
);

create index idx_order_items_order on public.order_items(order_id);

create table public.order_status_history (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  from_status   text,
  to_status     text not null,
  changed_by    uuid references public.users(id),
  notes         text,
  created_at    timestamptz default now()
);

create index idx_order_status_history_order on public.order_status_history(order_id);

-- ══════════════════════════════════════════════════════════════════════
-- DELIVERY ZONES
-- ══════════════════════════════════════════════════════════════════════

create table public.delivery_zones (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,         -- ex: "Até 3km", "Centro"
  type          text not null default 'radius' check (type in ('radius','zip_list')),
  radius_km     numeric(5,2),          -- se type = 'radius'
  zip_codes     text[] default '{}',   -- se type = 'zip_list'
  fee           numeric(10,2) not null default 0,
  min_order     numeric(10,2) default 0,
  estimated_min integer default 30,    -- tempo estimado em minutos
  is_active     boolean default true,
  sort_order    integer default 0,
  created_at    timestamptz default now()
);

create index idx_delivery_zones_restaurant on public.delivery_zones(restaurant_id);

-- ══════════════════════════════════════════════════════════════════════
-- OPERATING HOURS
-- ══════════════════════════════════════════════════════════════════════

create table public.operating_hours (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day_of_week   integer not null check (day_of_week between 0 and 6), -- 0=dom
  open_time     time not null,
  close_time    time not null,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

create index idx_operating_hours_restaurant on public.operating_hours(restaurant_id);

create table public.scheduled_pauses (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  reason        text,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  created_at    timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════════════
-- PAYMENT CONFIG (gateway do restaurante)
-- ══════════════════════════════════════════════════════════════════════

create table public.payment_configs (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  gateway         text not null check (gateway in ('mercadopago','asaas','stripe','pagseguro','manual')),
  credentials     jsonb default '{}'::jsonb,  -- encrypted at app level
  accepts_pix     boolean default true,
  accepts_card    boolean default true,
  accepts_cash    boolean default true,
  accepts_card_delivery boolean default true,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(restaurant_id)
);

-- ══════════════════════════════════════════════════════════════════════
-- WHATSAPP
-- ══════════════════════════════════════════════════════════════════════

create table public.whatsapp_instances (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  provider      text not null check (provider in ('uazapi','meta_cloud')),
  phone_number  text,
  status        text default 'disconnected' check (status in ('connected','disconnected','connecting','banned')),
  credentials   jsonb default '{}'::jsonb,  -- encrypted at app level
  webhook_url   text,
  external_id   text,                 -- instance name (uazapi) ou phone_number_id (meta)
  agent_name    text default 'Assistente',
  agent_persona text default 'Você é um assistente de atendimento simpático e eficiente.',
  agent_enabled boolean default true,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(restaurant_id)
);

create table public.conversations (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id   uuid references public.customers(id) on delete set null,
  instance_id   uuid references public.whatsapp_instances(id) on delete cascade,
  contact_phone text not null,
  contact_name  text,
  status        text default 'open' check (status in ('open','closed','bot','human')),
  last_message_at timestamptz,
  unread_count  integer default 0,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index idx_conversations_restaurant on public.conversations(restaurant_id);
create index idx_conversations_phone on public.conversations(restaurant_id, contact_phone);

create table public.messages (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction       text not null check (direction in ('in','out')),
  content_type    text not null default 'text' check (content_type in ('text','image','audio','video','document','location','contact','sticker','template')),
  body            text,
  media_url       text,
  external_id     text,
  status          text default 'sent' check (status in ('sent','delivered','read','failed')),
  sender_type     text default 'contact' check (sender_type in ('contact','bot','agent','system')),
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz default now()
);

create index idx_messages_conversation on public.messages(conversation_id, created_at desc);

-- ══════════════════════════════════════════════════════════════════════
-- LOYALTY (skeleton - Fase 6 preenche)
-- ══════════════════════════════════════════════════════════════════════

create table public.loyalty_programs (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  type          text not null default 'points' check (type in ('points','cashback')),
  points_per_real numeric(10,2) default 1,     -- 1 ponto a cada R$1
  cashback_pct  numeric(5,2) default 5,        -- 5%
  is_active     boolean default false,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now(),
  unique(restaurant_id)
);

create table public.loyalty_balances (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  customer_id   uuid not null references public.customers(id) on delete cascade,
  balance       numeric(12,2) default 0,
  updated_at    timestamptz default now(),
  unique(restaurant_id, customer_id)
);

-- ══════════════════════════════════════════════════════════════════════
-- COUPONS (skeleton - Fase 6 preenche)
-- ══════════════════════════════════════════════════════════════════════

create table public.coupons (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  code          text not null,
  type          text not null check (type in ('percent','fixed','free_delivery')),
  value         numeric(10,2) not null,
  min_order     numeric(10,2) default 0,
  max_uses      integer,
  used_count    integer default 0,
  is_active     boolean default true,
  valid_from    timestamptz default now(),
  valid_until   timestamptz,
  created_at    timestamptz default now(),
  unique(restaurant_id, code)
);

-- ══════════════════════════════════════════════════════════════════════
-- CAMPAIGNS (skeleton - Fase 5 preenche)
-- ══════════════════════════════════════════════════════════════════════

create table public.campaigns (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name          text not null,
  type          text not null default 'broadcast' check (type in ('broadcast','recovery','automation')),
  status        text default 'draft' check (status in ('draft','scheduled','sending','sent','cancelled')),
  segment_filter jsonb default '{}'::jsonb,
  template      text,
  media_url     text,
  scheduled_at  timestamptz,
  sent_count    integer default 0,
  delivered_count integer default 0,
  read_count    integer default 0,
  replied_count integer default 0,
  converted_count integer default 0,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz default now()
);

create index idx_campaigns_restaurant on public.campaigns(restaurant_id);

-- ══════════════════════════════════════════════════════════════════════
-- FEEDBACKS
-- ══════════════════════════════════════════════════════════════════════

create table public.feedbacks (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  customer_id   uuid references public.customers(id) on delete set null,
  rating        integer not null check (rating between 1 and 5),
  comment       text,
  pillars       jsonb default '{}'::jsonb,  -- {temperatura: 4, entrega: 5, qualidade: 3, ...}
  created_at    timestamptz default now()
);

create index idx_feedbacks_restaurant on public.feedbacks(restaurant_id);

-- ══════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'restaurants','users','categories','products',
      'customers','orders','whatsapp_instances','conversations',
      'payment_configs'
    ])
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.handle_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════════

-- Helper: get restaurant IDs the current user belongs to
create or replace function public.user_restaurant_ids()
returns setof uuid as $$
  select restaurant_id from public.restaurant_users
  where user_id = auth.uid()
$$ language sql security definer stable;

-- Enable RLS on all tenant tables
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'restaurants','restaurant_users','categories','products',
      'option_groups','options','customers','customer_addresses',
      'orders','order_items','order_status_history',
      'delivery_zones','operating_hours','scheduled_pauses',
      'payment_configs','whatsapp_instances','conversations','messages',
      'loyalty_programs','loyalty_balances','coupons','campaigns','feedbacks'
    ])
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- Policies: tenant isolation
-- restaurants
create policy "users see own restaurants" on public.restaurants
  for select using (id in (select public.user_restaurant_ids()));
create policy "users update own restaurants" on public.restaurants
  for update using (id in (select public.user_restaurant_ids()));

-- restaurant_users
create policy "members see own org" on public.restaurant_users
  for select using (restaurant_id in (select public.user_restaurant_ids()));
create policy "owners manage members" on public.restaurant_users
  for all using (
    restaurant_id in (
      select restaurant_id from public.restaurant_users
      where user_id = auth.uid() and role in ('owner','manager')
    )
  );

-- Generic tenant policies for all other tables
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'categories','products','option_groups','options',
      'customers','customer_addresses',
      'orders','order_items','order_status_history',
      'delivery_zones','operating_hours','scheduled_pauses',
      'payment_configs','whatsapp_instances','conversations','messages',
      'loyalty_programs','loyalty_balances','coupons','campaigns','feedbacks'
    ])
  loop
    execute format(
      'create policy "tenant_select_%1$s" on public.%1$I for select using (restaurant_id in (select public.user_restaurant_ids()))',
      t
    );
    execute format(
      'create policy "tenant_insert_%1$s" on public.%1$I for insert with check (restaurant_id in (select public.user_restaurant_ids()))',
      t
    );
    execute format(
      'create policy "tenant_update_%1$s" on public.%1$I for update using (restaurant_id in (select public.user_restaurant_ids()))',
      t
    );
    execute format(
      'create policy "tenant_delete_%1$s" on public.%1$I for delete using (restaurant_id in (select public.user_restaurant_ids()))',
      t
    );
  end loop;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════
-- REALTIME (enable for dashboard tables)
-- ══════════════════════════════════════════════════════════════════════

alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.messages;

-- ══════════════════════════════════════════════════════════════════════
-- STORAGE BUCKETS
-- ══════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('restaurant-assets', 'restaurant-assets', true)
on conflict do nothing;

-- Storage policies
create policy "authenticated upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('product-images','restaurant-assets'));

create policy "public read product images"
  on storage.objects for select
  to public
  using (bucket_id in ('product-images','restaurant-assets'));

create policy "authenticated update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('product-images','restaurant-assets'));

create policy "authenticated delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('product-images','restaurant-assets'));
