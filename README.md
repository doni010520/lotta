# Lotta — a solução que lota o seu delivery

Plataforma completa de delivery com IA. Canal próprio + WhatsApp IA + CRM + Fidelidade + Tráfego Pago + Analytics.

## Stack

- **Monorepo** com pnpm workspaces
- **API:** Fastify + TypeScript
- **Admin:** Next.js 14 + Tailwind + Shadcn/UI
- **DB:** Supabase (PostgreSQL + RLS multi-tenant + Realtime + Storage)
- **Cache:** Redis
- **WhatsApp:** Uazapi (não oficial) + Meta Cloud API (oficial)
- **IA:** OpenAI GPT-4.1-mini

## Setup

1. Criar projeto no Supabase Cloud
2. Rodar `packages/db/migrations/0001_foundation.sql` no SQL Editor
3. Copiar `.env.example` para `.env` e preencher
4. `pnpm install`
5. `pnpm dev:api` (porta 3001) + `pnpm dev:admin` (porta 3000)

## Estrutura

```
platform/
├── apps/admin/          # Painel do restaurante (Next.js 14)
├── apps/menu/           # Cardápio público — Fase 2
├── packages/shared/     # Types + validações Zod
├── packages/db/         # Migrations SQL
├── services/api/        # REST API (Fastify)
├── services/whatsapp/   # Bridge WhatsApp — Fase 3
├── services/ai-agent/   # Agente IA — Fase 3
├── services/ads-engine/ # Tráfego pago — Fase 7
├── services/integrations/ # iFood/99Food — Fase 4
├── services/workers/    # BullMQ workers — Fase 5
└── infra/               # Docker Compose
```

## Fases

- [x] Fase 1: Schema + API + Admin básico
- [x] Fase 2: Cardápio digital + checkout
- [x] Fase 3: WhatsApp IA
- [x] Fase 4: iFood + 99Food
- [x] Fase 5: CRM + Marketing
- [x] Fase 6: Fidelidade + Cupons
- [x] Fase 7: Meta Ads com IA
- [x] Fase 8: Google Ads + GMB
- [x] Fase 9: PDV + Logística
- [x] Fase 10: Analytics
- [x] Fase 11: Onboarding + Billing

## Deploy no Easypanel

Cada serviço vira um app no Easypanel com seu Dockerfile:

| App Easypanel | Dockerfile | Porta | Domínio |
|--------------|------------|-------|---------|
| lotta-api | `services/api/Dockerfile` | 3001 | api.seudominio.com |
| lotta-admin | `apps/admin/Dockerfile` | 3000 | app.seudominio.com |
| lotta-menu | `apps/menu/Dockerfile` | 3002 | cardapio.seudominio.com |
| lotta-whatsapp | `services/whatsapp/Dockerfile` | 3003 | wa.seudominio.com |
| lotta-integrations | `services/integrations/Dockerfile` | 3004 | (interno) |
| lotta-workers | `services/workers/Dockerfile` | 3005 | (interno) |
| lotta-ads | `services/ads-engine/Dockerfile` | 3006 | (interno) |
| redis | imagem `redis:7-alpine` | 6379 | (interno) |

**Banco:** Supabase Cloud (não sobe no Easypanel).

### Passo a passo

1. Criar projeto Supabase Cloud → rodar migrations 0001 a 0006
2. No Easypanel: criar projeto `lotta`
3. Adicionar app Redis (imagem `redis:7-alpine`, volume persistente)
4. Para cada serviço: criar app → tipo Git → apontar pro repo → setar Dockerfile path + variáveis de ambiente
5. No Cloudflare DNS: apontar domínios para o IP da VPS (DNS only, sem proxy para webhooks)
6. No Easypanel: configurar domínio + SSL automático em cada app

**Hostname interno do Redis:** `lotta_redis` (padrão Easypanel: `projeto_servico`)
