-- LOTTA — TODAS as migrations combinadas (0001 a 0008), na ordem.
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- A seção 0002 (SEED) cria o restaurante demo "Burger Demo":
--   se quiser o banco LIMPO, apague o bloco 0002 antes de rodar.


-- ======================================================================
-- 0001_foundation.sql
-- ======================================================================

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


-- ======================================================================
-- 0002_seed.sql
-- ======================================================================

-- Seed: restaurante de teste
-- Rodar DEPOIS da migration 0001 e DEPOIS de criar um user via auth

-- Restaurante demo
insert into public.restaurants (id, name, slug, phone, email, document, address, is_open, status, trial_ends_at)
values (
  '00000000-0000-0000-0000-000000000001',
  'Burger Demo',
  'burger-demo',
  '71999999999',
  'demo@burgerdemo.com',
  '12345678000100',
  '{"street":"Rua Exemplo","number":"123","neighborhood":"Centro","city":"Salvador","state":"BA","zip":"40000000","lat":-12.9714,"lng":-38.5124}'::jsonb,
  true,
  'trial',
  now() + interval '15 days'
);

-- Categorias
insert into public.categories (id, restaurant_id, name, sort_order) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Hambúrgueres', 1),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Acompanhamentos', 2),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Bebidas', 3),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Sobremesas', 4);

-- Produtos
insert into public.products (id, restaurant_id, category_id, name, description, price, sort_order) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Smash Burger Clássico', 'Pão brioche, 2x smash 80g, queijo cheddar, cebola caramelizada, molho da casa', 28.90, 1),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Smash Bacon', 'Pão brioche, 2x smash 80g, queijo cheddar, bacon crocante, molho barbecue', 32.90, 2),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Veggie Burger', 'Pão integral, hambúrguer de grão-de-bico, alface, tomate, maionese vegana', 26.90, 3),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Batata Frita P', 'Porção individual 150g', 12.90, 1),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Batata Frita G', 'Porção grande 300g com cheddar e bacon', 22.90, 2),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'Onion Rings', 'Porção com 8 unidades', 16.90, 3),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Coca-Cola Lata', '350ml', 6.90, 1),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'Suco Natural', 'Laranja ou Limão - 400ml', 9.90, 2),
  ('20000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'Brownie com Sorvete', 'Brownie de chocolate com bola de sorvete de creme', 18.90, 1);

-- Grupos de opcionais
insert into public.option_groups (id, restaurant_id, product_id, name, min_select, max_select, is_required, sort_order) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Ponto da Carne', 1, 1, true, 1),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Adicionais', 0, 5, false, 2);

-- Opções
insert into public.options (restaurant_id, option_group_id, name, price, sort_order) values
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Mal passado', 0, 1),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Ao ponto', 0, 2),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Bem passado', 0, 3),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Bacon extra', 5.00, 1),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Queijo extra', 4.00, 2),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Ovo', 3.00, 3),
  ('00000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 'Cebola crispy', 3.00, 4);

-- Zonas de entrega
insert into public.delivery_zones (restaurant_id, name, type, radius_km, fee, estimated_min, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'Até 2km', 'radius', 2, 5.00, 25, 1),
  ('00000000-0000-0000-0000-000000000001', 'Até 5km', 'radius', 5, 8.00, 35, 2),
  ('00000000-0000-0000-0000-000000000001', 'Até 8km', 'radius', 8, 12.00, 45, 3);

-- Horários de funcionamento
insert into public.operating_hours (restaurant_id, day_of_week, open_time, close_time) values
  ('00000000-0000-0000-0000-000000000001', 0, '17:00', '23:00'),  -- dom
  ('00000000-0000-0000-0000-000000000001', 1, '11:00', '14:00'),  -- seg almoço
  ('00000000-0000-0000-0000-000000000001', 1, '17:00', '23:00'),  -- seg jantar
  ('00000000-0000-0000-0000-000000000001', 2, '11:00', '14:00'),
  ('00000000-0000-0000-0000-000000000001', 2, '17:00', '23:00'),
  ('00000000-0000-0000-0000-000000000001', 3, '11:00', '14:00'),
  ('00000000-0000-0000-0000-000000000001', 3, '17:00', '23:00'),
  ('00000000-0000-0000-0000-000000000001', 4, '11:00', '14:00'),
  ('00000000-0000-0000-0000-000000000001', 4, '17:00', '23:00'),
  ('00000000-0000-0000-0000-000000000001', 5, '11:00', '00:00'),  -- sex
  ('00000000-0000-0000-0000-000000000001', 6, '11:00', '00:00');  -- sab

-- Clientes de teste
insert into public.customers (restaurant_id, name, phone, segment, consent_marketing, total_orders, total_spent) values
  ('00000000-0000-0000-0000-000000000001', 'Maria Silva', '71988887777', 'fidelizado', true, 15, 580.50),
  ('00000000-0000-0000-0000-000000000001', 'João Santos', '71977776666', 'promissor', true, 5, 195.00),
  ('00000000-0000-0000-0000-000000000001', 'Ana Costa', '71966665555', 'novato', false, 1, 42.90),
  ('00000000-0000-0000-0000-000000000001', 'Pedro Oliveira', '71955554444', 'inativo', true, 8, 312.00);


-- ======================================================================
-- 0003_customer_stats_fn.sql
-- ======================================================================

-- Function: increment customer stats after order
create or replace function public.increment_customer_stats(
  p_customer_id uuid,
  p_total numeric
) returns void as $$
begin
  update public.customers
  set
    total_orders = total_orders + 1,
    total_spent = total_spent + p_total,
    last_order_at = now(),
    first_order_at = coalesce(first_order_at, now()),
    updated_at = now()
  where id = p_customer_id;
end;
$$ language plpgsql security definer;


-- ======================================================================
-- 0004_crm.sql
-- ======================================================================

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


-- ======================================================================
-- 0005_loyalty.sql
-- ======================================================================

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


-- ======================================================================
-- 0006_billing.sql
-- ======================================================================

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


-- ======================================================================
-- 0007_fixes.sql
-- ======================================================================

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


-- ======================================================================
-- 0008_security_fixes.sql
-- ======================================================================

-- 0008: ajustes de segurança e correção (follow-up da revisão)

-- ── P1-7 (finalização): order_number realmente por restaurante ──
-- Na 0007 o trigger foi criado, mas o DEFAULT serial da coluna disparava ANTES
-- do trigger (preenchendo new.order_number), então o guard do trigger nunca
-- executava e a numeração continuava global. Removemos o default para o trigger
-- assumir a numeração por restaurante.
alter table public.orders alter column order_number drop default;

-- Serializa a geração do número por restaurante (advisory lock) para evitar
-- corrida entre inserts concorrentes (max+1 não é atômico sozinho).
create or replace function public.next_order_number(p_restaurant_id uuid)
returns integer as $$
declare v_num integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_restaurant_id::text));
  select coalesce(max(order_number), 0) + 1 into v_num
  from public.orders
  where restaurant_id = p_restaurant_id;
  return v_num;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Rede de segurança: número único dentro de cada restaurante.
alter table public.orders
  add constraint uq_order_number_per_restaurant unique (restaurant_id, order_number);

-- ── P1-10 (finalização): billing_invoices não pode ser forjada via RPC ──
-- generate_monthly_invoice é SECURITY DEFINER e, por padrão do Supabase, era
-- executável por anon/authenticated via /rest/v1/rpc — permitindo a um tenant
-- gerar fatura para qualquer restaurante. Restringe a execução ao service role.
revoke execute on function public.generate_monthly_invoice(uuid, date) from public;
revoke execute on function public.generate_monthly_invoice(uuid, date) from anon;
revoke execute on function public.generate_monthly_invoice(uuid, date) from authenticated;


-- ===== 0009_ads.sql =====
-- ── Sprint 1: Tráfego Pago — campanhas de anúncio geridas pela IA ──
-- Armazena as campanhas (Meta/Google/GMB) criadas e otimizadas pelo ads-engine,
-- com criativos gerados por IA e métricas sincronizadas semanalmente.

create table public.ad_campaigns (
  id                   uuid primary key default uuid_generate_v4(),
  restaurant_id        uuid not null references public.restaurants(id) on delete cascade,
  channel              text not null check (channel in ('meta','google','gmb')),
  objective            text not null default 'sales',
  name                 text not null,
  status               text not null default 'draft' check (status in ('draft','active','paused','archived')),
  daily_budget         numeric(10,2) not null default 0,
  product_id           uuid references public.products(id) on delete set null,
  -- id da campanha na plataforma (Meta/Google); null enquanto não publicada
  platform_campaign_id text,
  -- 3 variações de copy geradas pela IA: [{ "text": "...", "active": true }]
  creatives            jsonb not null default '[]'::jsonb,
  -- métricas agregadas dos últimos 7 dias: { impressions, clicks, ctr, spend, conversions }
  metrics              jsonb not null default '{}'::jsonb,
  metrics_updated_at   timestamptz,
  last_optimized_at    timestamptz,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index idx_ad_campaigns_restaurant on public.ad_campaigns(restaurant_id);
create index idx_ad_campaigns_status on public.ad_campaigns(restaurant_id, status);
-- garante no máximo 1 campanha viva por canal por restaurante (evita duplicar no cron semanal)
create unique index uniq_ad_campaign_live
  on public.ad_campaigns(restaurant_id, channel)
  where status in ('draft','active','paused');

-- RLS multi-tenant (mesmo padrão das demais tabelas)
alter table public.ad_campaigns enable row level security;

do $$ declare t text;
begin for t in select unnest(array['ad_campaigns'])
loop
  execute format('create policy "tenant_select_%1$s" on public.%1$I for select using (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_insert_%1$s" on public.%1$I for insert with check (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_update_%1$s" on public.%1$I for update using (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_delete_%1$s" on public.%1$I for delete using (restaurant_id in (select public.user_restaurant_ids()))', t);
end loop; end; $$;


-- ===== 0010_loyalty_redeem.sql =====
-- ── Sprint 2: resgate de fidelidade no checkout do cliente ──
-- Guarda o valor de saldo (cashback) resgatado no pedido, separado do desconto de cupom.

alter table public.orders
  add column if not exists loyalty_redeemed numeric(10,2) not null default 0;
