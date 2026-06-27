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
