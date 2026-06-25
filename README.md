# Lotta — a solução que lota o seu delivery

Plataforma SaaS completa para restaurantes. Canal próprio de delivery com cardápio digital, agente de pedidos por WhatsApp com IA, CRM com segmentação automática e programa de fidelidade. Integrações com iFood/99Food, Meta Ads (CAPI), Google Ads e GMB estão implementadas e prontas para conectar após aprovação nas respectivas plataformas.

Concorrente direto da Brendi. Diferencial planejado: Google Ads + Google Meu Negócio (Brendi só faz Meta Ads). Requer token de desenvolvedor Google Ads para ativar.

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Monorepo | pnpm workspaces |
| API | Fastify 5 + TypeScript |
| Admin | Next.js 14 + Tailwind CSS + Manrope/Space Grotesk |
| Cardápio público | Next.js 14 (ISR, revalidate 60s) |
| Banco | Supabase Cloud (PostgreSQL + RLS multi-tenant + Realtime + Storage) |
| Cache/Filas | Redis 7 + BullMQ |
| WhatsApp | Uazapi (não-oficial) + Meta Cloud API (oficial), dual provider |
| IA | OpenAI GPT-4.1-mini (agente), GPT-4o (copy ads), Whisper (transcrição de áudio) |
| Pagamento | Gateway do restaurante (Mercado Pago, Asaas, Stripe, PagSeguro) — Lotta não toca no dinheiro |
| Deploy | Easypanel (Docker) na VPS, Cloudflare DNS |

## Estrutura do monorepo

```
lotta/
├── apps/
│   ├── admin/                  # Painel do restaurante (Next.js 14)
│   │   ├── app/
│   │   │   ├── auth/           # Login + registro
│   │   │   ├── onboarding/     # Wizard de setup (5 etapas)
│   │   │   └── (dashboard)/    # Layout com sidebar
│   │   │       ├── pedidos/        # Kanban de pedidos (Realtime)
│   │   │       ├── analytics/      # Dashboard de analytics
│   │   │       ├── cardapio/       # CRUD de categorias + produtos
│   │   │       ├── clientes/       # Lista + segmentos RFM
│   │   │       ├── campanhas/      # Disparos em massa WhatsApp
│   │   │       ├── conversas/      # Inbox WhatsApp em tempo real
│   │   │       ├── fidelidade/     # Config pontos/cashback
│   │   │       ├── cupons/         # Criar individual ou em lote
│   │   │       ├── trafego/        # Meta Ads + Google Ads + GMB
│   │   │       ├── integracoes/    # iFood + 99Food credentials
│   │   │       ├── whatsapp/       # Provider + agente IA config
│   │   │       └── configuracoes/  # Dados gerais, horários, zonas, pagamento, marketing tags
│   │   ├── components/
│   │   │   └── sidebar.tsx     # Navegação principal (fundo café, ícone tigela SVG)
│   │   └── lib/                # Supabase client, API client, utils
│   │
│   └── menu/                   # Cardápio digital público (Next.js 14)
│       ├── app/
│       │   └── [slug]/         # Rota dinâmica por restaurante
│       │       ├── page.tsx        # Menu com busca, filtros, "mais pedidos"
│       │       ├── layout.tsx      # Header + injeção Meta Pixel/GA4/GTM
│       │       └── pedido/[orderId]/ # Tracking com Realtime
│       ├── components/
│       │   ├── menu-client.tsx     # Grid de produtos + carrinho flutuante
│       │   ├── product-modal.tsx   # Opcionais, observações, quantidade
│       │   └── cart-drawer.tsx     # Checkout 3 etapas (carrinho → endereço → pagamento)
│       └── lib/
│           ├── cart.tsx            # React Context (sem localStorage)
│           └── payment.ts         # Abstração Mercado Pago + Asaas (Pix API)
│
├── packages/
│   ├── shared/                 # Types TypeScript + validações Zod + internal client
│   │   └── src/
│   │       ├── types.ts
│   │       ├── validations.ts
│   │       └── internal-client.ts  # wa.sendText(), wa.sendMedia(), wa.sendTemplate()
│   └── db/
│       └── migrations/         # 8 migrations SQL (rodar em ordem no Supabase)
│           ├── 0001_foundation.sql     # 30+ tabelas, RLS, triggers, storage buckets
│           ├── 0002_seed.sql           # Restaurante demo "Burger Demo"
│           ├── 0003_customer_stats_fn.sql  # increment_customer_stats()
│           ├── 0004_crm.sql            # campaign_messages, automation_rules, customer_rfm view
│           ├── 0005_loyalty.sql        # loyalty_transactions, coupon_usages, credit/redeem/validate functions
│           ├── 0006_billing.sql        # billing_invoices, restaurant_networks, generate_monthly_invoice()
│           ├── 0007_fixes.sql          # order_number trigger, unique fatura, search_path nas funções
│           └── 0008_security_fixes.sql # order_number por tenant (default+lock), revoke RPC billing
│
├── services/
│   ├── api/                    # REST API central (Fastify, porta 3001)
│   │   └── src/
│   │       ├── routes/             # auth, restaurants, categories, products, delivery-zones, operating-hours, orders, uploads
│   │       ├── plugins/            # supabase (auth + tenant resolution), auth-guard
│   │       └── modules/
│   │           └── order-hooks.ts  # onOrderStatusChange → WhatsApp + loyalty + feedback
│   │                               # onOrderCreated → CAPI purchase event
│   │
│   ├── whatsapp/               # Bridge WhatsApp + Agente IA (Fastify, porta 3003)
│   │   └── src/
│   │       ├── providers/          # ChannelProvider interface
│   │       │   ├── uazapi.ts       # number/text, delay:"3000", POST /message/download
│   │       │   └── meta.ts         # Graph API, verificação de assinatura, templates HSM
│   │       ├── agent/
│   │       │   └── index.ts        # System prompt com cardápio XML, Whisper, verify-after-write
│   │       └── routes/
│   │           ├── webhooks.ts     # POST /webhooks/uazapi + GET/POST /webhooks/meta
│   │           ├── inbound.ts      # Debounce buffer + roteamento pro agente
│   │           └── send.ts         # POST /api/send/text|media|template (API interna)
│   │
│   ├── integrations/           # iFood + 99Food + Logística (Fastify, porta 3004)
│   │   └── src/
│   │       ├── ifood/
│   │       │   ├── client.ts       # OAuth2 + token cache, polling, confirm/dispatch/cancel, import
│   │       │   └── poller.ts       # Loop de polling a cada 30s, auto-accept configurável
│   │       ├── ninety9food/
│   │       │   └── client.ts       # API client + import de pedidos
│   │       └── delivery/
│   │           └── providers.ts    # DeliveryProvider: FoodyProvider, PickNGoProvider, SelfDeliveryProvider, SaiposClient
│   │
│   ├── workers/                # Workers de background (Fastify + BullMQ, porta 3005)
│   │   └── src/
│   │       ├── segmentation.ts     # Cron: refresh RFM + sync segmentos (a cada 6h)
│   │       ├── campaigns.ts        # BullMQ: envio de campanhas com IA variando mensagem, 1msg/s
│   │       ├── recovery.ts         # Cron: carrinho abandonado (30min) + clientes inativos
│   │       ├── loyalty.ts          # Cron: expiração de pontos/cashback vencidos
│   │       └── loyalty-notify.ts   # Notificação WhatsApp após crédito de fidelidade
│   │
│   └── ads-engine/             # Meta Ads + Google Ads + GMB (Fastify, porta 3006)
│       └── src/
│           ├── meta/
│           │   └── client.ts       # Criativos IA (GPT-4o), campanhas, ad sets, CAPI Purchase
│           └── google/
│               └── client.ts       # Search campaigns, keywords IA, GMB posts/reviews/sync
│
└── infra/
    └── docker-compose.yml      # Todos os serviços + Redis

```


## Status por módulo

| Módulo | Status | Nota |
|--------|--------|------|
| Cardápio digital + checkout | ✅ Funcional | ISR 60s, checkout Pix/cartão/dinheiro |
| Pagamento Pix (Mercado Pago + Asaas) | ✅ Funcional | Rota /api/payments/pix + webhook de confirmação |
| Agente WhatsApp IA | ✅ Funcional | GPT-4.1-mini, Whisper, verify-after-write, debounce |
| CRM + segmentação RFM | ✅ Funcional | Cron refresh + sync automático de segmentos |
| Campanhas WhatsApp | ✅ Funcional | BullMQ queue, IA varia mensagem, throttle 1msg/s |
| Recovery (carrinho + inativos) | ✅ Funcional | Cron com envio via WhatsApp |
| Fidelidade (pontos/cashback) | ✅ Funcional | Crédito automático, expiração, resgate via SQL functions |
| Cupons | ✅ Funcional | Validação com regras, bulk create |
| iFood polling | ✅ Funcional | Polling 30s, import de pedidos, auto-accept |
| 99Food polling | ✅ Funcional | Polling 60s, import de pedidos |
| Meta CAPI (Purchase event) | ✅ Funcional | Server-side, chamado automaticamente após pedido |
| Delivery dispatch | ✅ Funcional | FoodyProvider, PickNGoProvider, SelfDeliveryProvider |
| Feedback pós-venda | ✅ Funcional | BullMQ delayed job (30min após entrega) |
| Meta Ads (criação de campanhas) | ⚠️ Requer App Review | Client pronto, endpoints expostos, precisa de aprovação Meta |
| Google Ads (campanhas de busca) | ⚠️ Requer developer token | Client pronto, geração de keywords por IA funcional |
| Google Meu Negócio | ⚠️ Requer OAuth | Posts automáticos + resposta a reviews por IA, precisa de OAuth do restaurante |
| PDV (Saipos, Glow, Colibri) | 🔧 Client pronto, sem endpoint | SaiposClient existe, integração depende de acesso à API do parceiro |
| Billing (cobrança SaaS) | 🔧 Schema + SQL function | generate_monthly_invoice() pronta, falta gateway de cobrança recorrente |
| Multi-unidade | 🔧 Schema pronto | Tabela restaurant_networks + FK, falta painel de rede consolidado |

## Comunicação entre serviços

Todos os serviços lêem/escrevem no mesmo Supabase Cloud. Comunicação direta entre serviços é via HTTP interno com header `x-internal-secret`.

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE CLOUD                           │
│  PostgreSQL + RLS + Realtime + Storage                          │
└──────────┬──────────┬──────────┬──────────┬──────────┬──────────┘
           │          │          │          │          │
     ┌─────┴───┐ ┌────┴────┐ ┌──┴───┐ ┌───┴────┐ ┌───┴─────┐
     │   API   │ │  Admin  │ │ Menu │ │Workers │ │  Ads    │
     │  :3001  │ │  :3000  │ │:3002 │ │ :3005  │ │ :3006   │
     └────┬────┘ └─────────┘ └──────┘ └───┬────┘ └────┬────┘
          │                                │           │
          │ PATCH /orders/:id/status       │           │
          ├──────────────────────────────►│           │
          │                    wa.sendText()           │
          │                                │           │
     ┌────┴──────────────────────────────────┴──────────┴────┐
     │              WhatsApp Service :3003                    │
     │   POST /api/send/text|media|template                  │
     │   POST /webhooks/uazapi | /webhooks/meta              │
     └───────────────────────────────────────────────────────┘
                              │
                     ┌────────┴────────┐
                     │  Integrations   │
                     │     :3004       │
                     │ iFood polling   │
                     │ 99Food sync     │
                     └─────────────────┘
```

### Fluxos de dados

| Evento | Caminho |
|--------|---------|
| Cliente faz pedido no cardápio | Menu → Supabase (order) → Admin vê via Realtime |
| Admin avança status do pedido | Admin → API PATCH → onOrderStatusChange → WhatsApp notifica cliente |
| Pedido entregue | API hook → credit_loyalty (SQL) → WhatsApp "Você ganhou X pontos!" |
| Pedido entregue +30min | API hook → WhatsApp "Qual nota de 1 a 5?" |
| Campanha disparada | Admin cria → BullMQ job → Workers envia via wa.sendText (IA varia por cliente) |
| Carrinho abandonado (30min) | Workers cron → wa.sendText com itens do carrinho |
| Cliente inativo | Workers cron → wa.sendText "Sentimos sua falta!" (cooldown 7 dias) |
| Pedido no iFood | Integrations poller → importIFoodOrder → Supabase → Admin vê via Realtime |
| Compra finalizada | API hook → Ads Engine CAPI → Meta Pixel Purchase event (server-side) |
| Mensagem WhatsApp recebida | Webhook → inbound handler → debounce → Agente IA → resposta |

## Identidade visual

| Token | Valor | Uso |
|-------|-------|-----|
| Páprica | `#E5402A` | Cor primária: botões, sidebar ativa, app icon |
| Páprica light | `#FF6A4D` | Gradiente topo da tigela |
| Páprica dark | `#C32E1C` | Hover de botões, gradiente base |
| Gema | `#FFB02E` | Acento dourado, caldo da tigela |
| Gema dot | `#FFC53D` | Ponto do logotipo "Lotta." |
| Café | `#2A1410` | Fundo da sidebar, texto escuro premium |
| Creme | `#FFF3E9` | Fundo claro (substitui bg-gray-50) |
| Body | `#33333C` | Texto padrão |
| Muted | `#8A6A5E` | Texto secundário |

| Fonte | Família | Uso |
|-------|---------|-----|
| Display | Space Grotesk 700 | Logotipo, títulos |
| UI | Manrope 400-700 | Corpo, botões, labels |
| Mono | Spline Sans Mono 400-500 | Tagline, valores, labels de seção |

- Botões: `border-radius: 11px`, fundo páprica, texto branco, Manrope 700
- Cards: `border-radius: 10px`
- Ícone: tigela SVG vetorial com gradiente + caldo dourado + 3 fios de vapor

## Variáveis de ambiente

```env
# ─── Supabase ───
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# ─── API ───
NEXT_PUBLIC_API_URL=https://api.seudominio.com
PORT=3001

# ─── Redis ───
REDIS_URL=redis://lotta_redis:6379

# ─── Internal service communication ───
INTERNAL_API_SECRET=gerar-string-aleatoria-aqui
WHATSAPP_INTERNAL_URL=http://lotta_lotta-whatsapp:3003
ADS_INTERNAL_URL=http://lotta_lotta-ads:3006

# ─── WhatsApp ───
WHATSAPP_PORT=3003
UAZAPI_WEBHOOK_TOKEN=
BOT_DEBOUNCE_MS=5000
META_VERIFY_TOKEN=
META_APP_SECRET=

# ─── OpenAI ───
OPENAI_API_KEY=sk-...

# ─── Workers ───
WORKERS_PORT=3005
CRON_SECRET=gerar-string-aleatoria-aqui

# ─── Ads Engine ───
ADS_PORT=3006

# ─── Integrations ───
INTEGRATIONS_PORT=3004
```

## Deploy no Easypanel

8 apps no projeto `lotta`:

| App | Dockerfile | Porta | Domínio | Expose |
|-----|-----------|-------|---------|--------|
| lotta-api | `services/api/Dockerfile` | 3001 | api.seudominio.com | Público |
| lotta-admin | `apps/admin/Dockerfile` | 3000 | app.seudominio.com | Público |
| lotta-menu | `apps/menu/Dockerfile` | 3002 | cardapio.seudominio.com | Público |
| lotta-whatsapp | `services/whatsapp/Dockerfile` | 3003 | wa.seudominio.com | Público (webhooks) |
| lotta-integrations | `services/integrations/Dockerfile` | 3004 | — | Interno |
| lotta-workers | `services/workers/Dockerfile` | 3005 | — | Interno |
| lotta-ads | `services/ads-engine/Dockerfile` | 3006 | — | Interno |
| redis | Imagem `redis:7-alpine` | 6379 | — | Interno |

### Passo a passo

1. Criar projeto Supabase Cloud → rodar migrations **0001 a 0008** em ordem no SQL Editor
2. No Easypanel: criar projeto `lotta`
3. Adicionar app Redis: imagem `redis:7-alpine`, volume persistente em `/data`
4. Para cada serviço: criar app → tipo Git → repo GitHub → Dockerfile path → variáveis de ambiente do `.env`
5. No Cloudflare DNS: apontar domínios para IP da VPS (DNS only para `wa.seudominio.com`, proxy OK pros demais)
6. No Easypanel: configurar domínio + SSL automático em cada app público
7. Configurar webhooks no provedor WhatsApp:
   - Uazapi: `https://wa.seudominio.com/webhooks/uazapi`
   - Meta: `https://wa.seudominio.com/webhooks/meta`

**Hostnames internos (padrão Easypanel: `projeto_servico`):**
- Redis: `lotta_redis`
- WhatsApp: `lotta_lotta-whatsapp`
- Ads: `lotta_lotta-ads`

## Desenvolvimento local

```bash
pnpm install                    # instala tudo
pnpm dev:api                    # API em :3001
pnpm dev:admin                  # Admin em :3000
pnpm dev:menu                   # Cardápio em :3002
pnpm dev:whatsapp               # WhatsApp em :3003
pnpm dev:integrations           # iFood/99Food em :3004
pnpm dev:workers                # Workers em :3005
pnpm dev:ads                    # Ads engine em :3006
```

Ou via Docker Compose: `cd infra && docker-compose up`

## Pré-requisitos burocráticos

Antes de ir pra produção com todas as features:

| Ação | Onde | Prazo estimado |
|------|------|----------------|
| Cadastrar como Software House iFood | developer.ifood.com.br | 4-6 semanas |
| App Review Meta (ads_management) | developers.facebook.com | 2-4 semanas |
| Token Google Ads API | ads.google.com/api | 1-2 semanas |
| Business Verification Meta | Meta Business Suite | 1-2 semanas |

A plataforma funciona sem essas integrações — o core (cardápio + WhatsApp + CRM + fidelidade) roda imediatamente.
