# PLANO DE CORREÇÃO — Lotta (revisão da entrega)

> Plano consolidado após auditar a entrega do dev (zip `lotta-final`). Verificação feita lendo o código entregue arquivo por arquivo, com checagem adversarial nos itens de segurança.
>
> **Modelo de pagamento definido: NÍVEL B (orquestrador).** A Lotta dispara a cobrança PIX usando as credenciais do gateway **do próprio restaurante** (em `payment_configs`); o dinheiro vai direto do cliente final para a conta do lojista. **A Lotta nunca custodia/repassa dinheiro.** A comissão da Lotta é cobrada à parte, por fatura mensal (`generate_monthly_invoice`). Todo este plano assume esse modelo.
>
> Os números de linha referem-se ao **código entregue** (o que o dev tem em mãos). Ordem de execução é por fase — não pular a Fase 0.

---

## ⚠️ Estado atual da entrega

A entrega **não compila e não builda**, e **introduziu** uma falha de pagamento e um bypass de autenticação que não existiam antes. Há trabalho real e bom em alguns itens (orders, billing, campanhas, jobs), mas não pode ir para produção — nem roda em dev — sem a Fase 0 e a Fase 1.

---

## FASE 0 — Desbloquear o build (a entrega não roda hoje)

### 0.1 Erro de sintaxe quebra `ads-engine` e `integrations`
- **Arquivos:** `services/ads-engine/src/meta/client.ts:11`, `services/ads-engine/src/google/client.ts:10` e `:14`, `services/integrations/src/ninety9food/client.ts:13`
- **Problema:** literal `|| \);` (barra invertida solta) — TypeScript inválido. Os módulos não carregam; os dois serviços inteiros não sobem. Derruba até o Meta CAPI que o README vende como funcional.
- **Correção:** substituir por uma string de fallback real, ex.: `throw new Error(data?.error?.message || "Erro na API externa");` nos 4 pontos.

### 0.2 Nenhum build Docker funciona (lockfile ausente)
- **Arquivos:** raiz do repo + 7 Dockerfiles (`RUN pnpm install --frozen-lockfile`)
- **Problema:** removeram o `|| pnpm install` (bom), mas **não commitaram o `pnpm-lock.yaml`**. Sem lockfile, `--frozen-lockfile` aborta o build.
- **Correção:** rodar `pnpm install` localmente, **commitar o `pnpm-lock.yaml`** na raiz, e nos Dockerfiles adicionar `COPY pnpm-lock.yaml ./` antes do `pnpm install`.

### 0.3 Crash em runtime no `GET /restaurants/current`
- **Arquivo:** `services/api/src/routes/restaurants.ts:8` e `:15`
- **Problema:** o handler é `async (request) =>` (sem `reply`), mas a linha 15 chama `reply.status(400)` → `ReferenceError` em qualquer erro de banco.
- **Correção:** trocar a assinatura para `async (request, reply) =>`.

---

## FASE 1 — Pagamento Nível B seguro + checkout conectado

> Objetivo: cobrança PIX real, na conta do lojista, **sem confiar em nenhum valor vindo do cliente**, com confirmação de pagamento validada. Resolve também o gap #3 (total calculado no browser) e o "pagamento online não cobra nada".

### 1.1 O valor cobrado NÃO pode vir do cliente
- **Arquivo:** `services/api/src/routes/payments.ts:9,31,56`
- **Problema:** `amount` e `restaurant_id` vêm do `request.body` e vão direto para o gateway. Cliente manda `amount: 0.01` num pedido de R$100 e paga 1 centavo. Vale para Mercado Pago E Asaas.
- **Correção:** o `/pix` deve receber **apenas `order_id`**. Buscar o pedido no banco e usar os valores autoritativos:
  ```
  const { data: order } = await supabase
    .from("orders").select("total, restaurant_id, payment_status")
    .eq("id", order_id).single();
  if (!order) return reply.status(404)...
  if (order.payment_status === "paid") return reply.status(409)...
  // usar order.total como valor da cobrança e order.restaurant_id para achar o gateway
  ```
  Nunca usar `amount`/`restaurant_id` do body.

### 1.2 Webhook de confirmação precisa validar assinatura do gateway
- **Arquivo:** `services/api/src/routes/payments.ts:77-125`
- **Problema:** o ramo **Asaas** (`:106-111`) aceita qualquer `POST` dizendo "PAYMENT_CONFIRMED" sem validar nada → qualquer um marca qualquer pedido como pago. O ramo Mercado Pago reconsulta a API (mitigação parcial) mas também não valida assinatura.
- **Correção (Nível B):**
  - Guardar um **secret/token de webhook por restaurante** em `payment_configs`.
  - **Asaas:** validar o header `asaas-access-token` contra o token configurado; rejeitar se não bater.
  - **Mercado Pago:** validar o header `x-signature` (HMAC com o secret do webhook), conforme docs do MP. Manter a reconsulta na API.
  - **Conferir o valor pago** contra `order.total` antes de confirmar (rejeitar subpagamento que tenha passado).
  - **Idempotência:** só disparar `onOrderStatusChange` se `payment_status` ainda não era `paid` (evita replay re-disparar hooks).

### 1.3 Exigir contexto mínimo e remover código morto
- **Arquivo:** `services/api/src/routes/payments.ts:22` (import morto de `../../menu/lib/payment`) e `apps/menu/lib/payment.ts` (helper antigo sem uso).
- **Correção:** remover o import morto e o arquivo `payment.ts` legado. Adicionar rate limit no `/pix` e `/webhook` (`@fastify/rate-limit`).

### 1.4 Conectar o checkout ao fluxo server-side (resolve gap #3)
- **Arquivos:** `apps/menu/components/cart-drawer.tsx` (hoje byte-idêntico ao original — insere o pedido direto via Supabase anon com total do browser), `apps/menu/lib/payment-client.ts` (hoje código morto).
- **Problema:** o checkout nunca chama a rota server-side; cria o pedido no browser com total calculado no cliente e, para PIX/cartão, deixa em "pending" sem gerar cobrança nenhuma.
- **Correção:**
  1. Criar o pedido via `POST /api/orders` (que já recomputa o total no servidor) em vez do insert direto no Supabase.
  2. Para pagamento online, chamar `requestPixPayment(order_id)` → `POST /api/payments/pix` e **exibir o QR Code PIX** ao cliente na tela de checkout/tracking.
  3. Manter "dinheiro/maquininha na entrega" como está (não gera cobrança online).

---

## FASE 2 — Fechar os buracos de segurança restantes

### 2.1 Segredo interno: remover default público e fechar bypass (gap #5)
- **Arquivos:** `services/api/src/modules/order-hooks.ts:110` (ainda tem `|| "lotta-internal"`), `packages/shared/src/internal-client.ts:2` e `services/ads-engine/src/server.ts:8` (usam só `!`, sem guarda de boot), `services/ads-engine/src/server.ts:11-15` (bypass).
- **Problemas:** (a) `"lotta-internal"` ainda hardcoded; (b) com a env ausente, `requireInternal` faz `undefined !== undefined` → **autoriza sem credencial** (pior que o original); (c) `.env.example:36` traz default fraco.
- **Correção:** remover todos os literais `lotta-internal`; **falhar no boot** (`throw`) em todo serviço se `INTERNAL_API_SECRET` não estiver setado (como já foi feito em `whatsapp/send.ts:9-11`); na comparação, rejeitar explicitamente quando o header estiver ausente/vazio; remover a 2ª via `CRON_SECRET` do ads-engine se `CRON_SECRET` puder ser vazio. Limpar `.env.example`.

### 2.2 CORS aberto nos serviços que faltaram (gap #6)
- **Arquivos:** `services/integrations/src/server.ts:8` e `services/ads-engine/src/server.ts:19` (ainda `origin: true`).
- **Correção:** aplicar a mesma allowlist por env já usada em `api` e `whatsapp`.

### 2.3 Webhook Meta valida o body errado (gap #4)
- **Arquivo:** `services/whatsapp/src/routes/webhooks.ts:66,79,85` + `services/whatsapp/src/server.ts`
- **Problema:** o bypass de header foi fechado (bom), mas a assinatura é validada sobre `JSON.stringify(request.body)` porque o plugin de raw body não está registrado → **webhooks legítimos da Meta passam a falhar (401)**. Além disso `timingSafeEqual` lança exceção quando os buffers têm tamanhos diferentes → 500.
- **Correção:** registrar `fastify-raw-body` e validar o HMAC sobre `request.rawBody`. Antes do `timingSafeEqual`, comparar tamanhos e retornar 401 se diferentes.

### 2.4 `billing_invoices` ainda forjável via RPC (gap #10)
- **Arquivo:** `packages/db/migrations/0007_fixes.sql` (função `generate_monthly_invoice`, `SECURITY DEFINER`)
- **Problema:** o insert direto foi bloqueado, mas a função é executável por `anon`/`authenticated` (sem `REVOKE`) e não checa se o caller pertence ao `restaurant_id` → tenant pode forjar fatura de qualquer restaurante via `POST /rest/v1/rpc/generate_monthly_invoice`.
- **Correção:** `revoke execute on function public.generate_monthly_invoice(uuid, date) from public, anon, authenticated;` (deixar só service-role). Opcional: checagem de membership dentro da função.

### 2.5 Resíduo do gap #1 (manipulação de preço por opções)
- **Arquivo:** `services/api/src/routes/orders.ts:20,68` e `products.ts:80-122`
- **Problema:** `options[].price` vem do cliente e é somado ao total sem revalidar contra o banco; `quantity` sem `.min(1)`; endpoints de option-groups/options sem Zod (`price` negativo possível).
- **Correção:** revalidar preço de cada opção contra a tabela `options` no servidor; `quantity` inteiro `>= 1`; aplicar `createOptionGroupSchema`/`createOptionSchema` (já existem em `validations.ts`).

---

## FASE 3 — Correção de negócio

### 3.1 Preço do pedido WhatsApp (gap #2 — parcial)
- **Arquivo:** `services/whatsapp/src/agent/index.ts:222,267,196`
- **Feito:** preço unitário agora vem do banco ✅.
- **Falta:** `delivery_fee` ainda hardcoded `0` (calcular pela `delivery_zone`); preço das opções/adicionais zerado (`price: 0`) — ler do banco; `quantidade` sem trava (qty negativa possível) — clampar `>= 1`.

### 3.2 `order_number` global → por restaurante (gap #7 — não corrigido)
- **Arquivo:** `packages/db/migrations/0001_foundation.sql:186` + `0007_fixes.sql`
- **Problema:** o default `serial` global nunca foi removido, então o trigger per-tenant **nunca dispara** (é código morto). Numeração continua global entre todos os restaurantes.
- **Correção:** `alter table orders alter column order_number drop default;` e deixar o trigger `set_order_number` preencher por tenant; adicionar `unique(restaurant_id, order_number)`.

### 3.3 RLS por papel não aplicado (gap #9 — não corrigido)
- **Arquivos:** policies em `0001/0004/0005` + `requireRole` em `auth-guard.ts` (corrigido mas **nunca chamado**).
- **Problema:** qualquer membro, inclusive `viewer`, ainda faz update/delete em produtos, categorias, pedidos etc.
- **Correção:** adicionar `preHandler: requireRole("owner","manager")` nas rotas de mutação (delete/update) **ou** policies de RLS que diferenciem papel. Hoje o import de `requireRole` é código morto.

### 3.4 Debounce do WhatsApp não é multi-instância nem sobrevive a restart (gap #13 — parcial)
- **Arquivo:** `services/whatsapp/src/routes/inbound.ts:12,15,103-110`
- **Problema:** o texto foi pro Redis, mas o **timer continua local**; em restart os buffers órfãos expiram sem processar (mensagem perdida) e, em multi-instância, há corrida que gera **pedido duplicado**. O comentário "survives restart, works multi-instance" é falso.
- **Correção:** ou (a) coordenar o debounce inteiro no Redis (lock + drain atômico, ex.: `LMOVE`/`SETNX`), ou (b) assumir single-instance explicitamente e adicionar um sweeper que drena buffers expirados. Em qualquer caso, adicionar **idempotência na criação do pedido** (`agent/index.ts:257`) e corrigir o comentário.

### 3.5 Onboarding — step "agent" sem escopo de tenant (gap #17 — parcial)
- **Arquivo:** `apps/admin/app/onboarding/page.tsx:52-55`
- **Problema:** o update de `whatsapp_instances` usa só `.limit(1)` com comentário "RLS ensures..."; os outros steps já foram escopados.
- **Correção:** adicionar `.eq("restaurant_id", restId)` (o `restId` já está disponível).

---

## FASE 4 — Engenharia e produção

### 4.1 Dockerfiles dos serviços backend (gap #18 — parcial)
- **Arquivos:** `services/*/Dockerfile` (5 serviços)
- **Feito:** `apps/admin` e `apps/menu` viraram multi-stage com `node` standalone ✅.
- **Falta:** os 5 serviços ainda rodam TS via `tsx` em produção (sem `tsc`→`dist`); todos os 7 rodam como **root**; nenhum `HEALTHCHECK`; `EXPOSE $(grep ...)` não funciona.
- **Correção:** stage de build com `pnpm build` (tsc → `dist`), runtime com `node dist/server.js`; `USER node`; `HEALTHCHECK`; `EXPOSE` com porta literal.

### 4.2 CI / lint / testes de fato funcionando (gap #20 — cosmético hoje)
- **Arquivos:** `.github/workflows/ci.yml`, `.eslintrc.json`, `.prettierrc`, `package.json` (raiz e pacotes), `packages/db/tests/money-functions.test.sql`
- **Problemas:** CI quebra no install (sem lockfile — resolvido na Fase 0); **sem passo de lint**; `eslint`/`prettier` **não instalados** e nenhum pacote tem script `lint`; teste SQL **sem runner** e **sem assertions**, faltando `redeem_loyalty`; **zero teste JS** (`pnpm -r test` agora falha porque vitest não acha arquivos); chaves duplicadas no `package.json` raiz.
- **Correção:** instalar `eslint`+`@typescript-eslint/*`+`prettier` como devDeps; script `lint` em cada pacote; passo de lint no CI; rodar os testes SQL no CI (via `psql` contra um Postgres de serviço) com `assert`/`raise exception` e cobrir `redeem_loyalty`; adicionar ao menos alguns testes vitest reais (ou remover o script `test` dos pacotes sem teste para o CI não falhar); remover chaves duplicadas do `package.json`.

### 4.3 docker-compose — healthcheck faltando (gap #21 — parcial)
- **Arquivo:** `infra/docker-compose.yml`
- **Falta:** `integrations`, `workers` e `ads-engine` sem `healthcheck`.
- **Correção:** adicionar healthcheck nos três.

### 4.4 Campanhas — rate limit e atomicidade (código novo)
- **Arquivo:** `services/api/src/routes/campaigns.ts:31-38`
- **Problema:** sem rate limit; o check `status!=='draft'` e o update não são atômicos (TOCTOU) → dois POSTs concorrentes disparam a campanha **duas vezes** (2× custo OpenAI + WhatsApp).
- **Correção:** `update(...).eq("status","draft")` atômico (e checar linhas afetadas) + `jobId` na fila para dedup; `@fastify/rate-limit` no endpoint.

### 4.5 README e migrations
- **Arquivos:** `README.md`, `package.json:20`, `packages/db/`
- **Problemas:** README manda rodar "migrations 0001 a 0006" — falta a **0007** (sem ela, as correções de banco ficam dormentes); `package.json` referencia `@lotta/db migrate` mas não existe `packages/db/package.json`.
- **Correção:** atualizar o README para incluir a 0007; criar `packages/db/package.json` ou ajustar o script.
- **Honestidade do README:** após a Fase 0, o **99Food** passa a funcionar de ponta a ponta (poller já está ligado). **Google Ads/GMB** continuam esqueleto (endpoints existem, mas sem UI admin e sem agendador de cron) — marcar como "infra pronta, ativação pendente", não "✅ funcional".

---

## Resumo por prioridade

| Fase | Tema | Bloqueia produção? |
|------|------|--------------------|
| **0** | Build quebrado (sintaxe, lockfile, crash) | **Sim — não roda nem em dev** |
| **1** | Pagamento Nível B seguro + checkout conectado | **Sim — é o objetivo do produto** |
| **2** | Segurança restante (secret, CORS, webhook Meta, RPC billing, preço) | **Sim** |
| **3** | Correção de negócio (order_number, RLS papel, debounce, agente) | Alto |
| **4** | Engenharia (Docker prod, CI/testes, compose, README) | Médio |

**Regra de ouro do Nível B:** nenhum valor financeiro pode vir do cliente. Total do pedido, valor da cobrança e confirmação de pagamento são sempre derivados/validados no servidor. Isso protege o lojista (cujo dinheiro é cobrado) e, de quebra, blinda o cálculo da comissão da Lotta.
