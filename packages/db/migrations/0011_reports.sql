-- ── Sprint 3: Relatórios IA — funil de conversão + insights de feedback ──

-- Eventos do cardápio para o funil de conversão (view → produto → carrinho → checkout → compra)
create table public.menu_events (
  id            uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  session_id    text,
  type          text not null check (type in ('view_menu','view_product','add_to_cart','begin_checkout','purchase')),
  product_id    uuid references public.products(id) on delete set null,
  order_id      uuid references public.orders(id) on delete set null,
  created_at    timestamptz default now()
);

create index idx_menu_events_restaurant on public.menu_events(restaurant_id, created_at);
create index idx_menu_events_type on public.menu_events(restaurant_id, type, created_at);

-- Resumo + ações recomendadas geradas por IA a partir dos feedbacks
create table public.feedback_insights (
  id              uuid primary key default uuid_generate_v4(),
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  period_days     integer not null default 30,
  summary         text,
  recommendations jsonb not null default '[]'::jsonb, -- [{ "title": "...", "action": "..." }]
  sentiment       text check (sentiment in ('positivo','neutro','negativo')),
  avg_rating      numeric(3,2),
  sample_size     integer not null default 0,
  created_at      timestamptz default now()
);

create index idx_feedback_insights_restaurant on public.feedback_insights(restaurant_id, created_at desc);

-- RLS multi-tenant (leitura pelo dono; inserção feita via service role nos serviços internos)
alter table public.menu_events enable row level security;
alter table public.feedback_insights enable row level security;

do $$ declare t text;
begin for t in select unnest(array['menu_events','feedback_insights'])
loop
  execute format('create policy "tenant_select_%1$s" on public.%1$I for select using (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_insert_%1$s" on public.%1$I for insert with check (restaurant_id in (select public.user_restaurant_ids()))', t);
  execute format('create policy "tenant_delete_%1$s" on public.%1$I for delete using (restaurant_id in (select public.user_restaurant_ids()))', t);
end loop; end; $$;
