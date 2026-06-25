# GAPS.md — Correções pendentes (Lotta)

> Punch list de correções priorizada por risco. Baseada em revisão de código (segurança, correção de negócio, robustez e engenharia de suporte).
> **Além destes itens**, já foi solicitado o alinhamento entre código e README (Google Ads/GMB, 99Food, fila de campanhas, pagamento online, pgvector, PDV).
>
> Ordem de execução recomendada no final do documento.

---

## 🔴 P0 — Segurança e dinheiro (antes de qualquer cliente real)

### 1. Mass assignment no pedido
- **Arquivo:** `services/api/src/routes/orders.ts:54` (e `:62-63` para `order_items`)
- **Problema:** `insert({ ...body, restaurant_id })` espalha o body do cliente direto no insert. O cliente controla `total`, `payment_status`, `status` — dá para criar pedido "pago" com total zero.
- **Correção:** validar com Zod e usar **allowlist explícita** de campos. Nunca espalhar `body` no insert.

### 2. Preço do pedido vem do LLM, não do banco
- **Arquivo:** `services/whatsapp/src/agent/index.ts:197` (preço) e `:254` (`delivery_fee: 0` hardcoded)
- **Problema:** `preco_unitario` é lido do XML que o modelo gerou; o LLM pode alucinar valor. Taxa de entrega nunca é cobrada.
- **Correção:** reler o preço da tabela `products` pelo `id` antes de gravar. Calcular `delivery_fee` pela `delivery_zone`. **Nunca confiar no LLM para valores.**

### 3. Total calculado no cliente e gravado direto via browser
- **Arquivo:** `apps/menu/components/cart-drawer.tsx:33` (cálculo) e `:105` (insert)
- **Problema:** cliente anônimo insere o pedido com `total` que ele mesmo calculou no browser. Adulterável no devtools. RLS não protege contra adulteração de valor.
- **Correção:** mover criação de pedido + cálculo de total para um endpoint server-side que recomputa preços a partir do banco.

### 4. Webhooks burláveis (assinatura opcional)
- **Arquivo:** `services/whatsapp/src/routes/webhooks.ts:9` (UAZAPI) e `:87` (Meta)
- **Problema:** se o header de assinatura **não vier**, a verificação é pulada e a requisição é aceita. Atacante simplesmente omite o header e injeta mensagens/pedidos falsos.
- **Correção:** rejeitar (401) quando a assinatura estiver ausente. Meta: validar sobre o **raw body** (não `JSON.stringify`) e usar `crypto.timingSafeEqual`.

### 5. Segredo interno com default público
- **Arquivo:** `packages/shared/src/internal-client.ts:2`, `services/whatsapp/src/routes/send.ts:6` (também `order-hooks.ts:103`, `ads-engine/server.ts:7`)
- **Problema:** cai no fallback `"lotta-internal"` se a env não for setada — segredo público no repositório. Qualquer um que alcance a porta 3003 envia WhatsApp em nome de qualquer restaurante.
- **Correção:** remover o fallback. Falhar no boot se `INTERNAL_API_SECRET` não existir.

### 6. CORS aberto
- **Arquivo:** `services/api/src/server.ts:17`, `services/whatsapp/src/server.ts:9`
- **Problema:** `origin: true` reflete qualquer origem.
- **Correção:** allowlist explícita (domínios do admin e do cardápio).

---

## 🟠 P1 — Correção de negócio (bugs que vão doer em produção)

### 7. `order_number` é serial global, não por restaurante
- **Arquivo:** `packages/db/migrations/0001_foundation.sql:186`
- **Problema:** `serial` é único no banco inteiro; todos os tenants compartilham a numeração. Restaurante novo vê "Pedido #4837".
- **Correção:** sequência por tenant (ou número derivado por `restaurant_id`).

### 8. Faturas duplicáveis
- **Arquivo:** `packages/db/migrations/0006_billing.sql`
- **Problema:** sem `unique(restaurant_id, period_start)` em `billing_invoices`. Cron rodando 2x gera fatura dupla.
- **Correção:** adicionar constraint única + `on conflict do nothing` em `generate_monthly_invoice`.

### 9. RLS não diferencia papel
- **Arquivo:** policies em `0001_foundation.sql` (`tenant_delete_*`, `tenant_update_*`)
- **Problema:** valem para qualquer membro. Um **`viewer` pode deletar pedidos, produtos, cupons**. O modelo de role existe mas não é aplicado. `requireRole` existe (`auth-guard.ts:13`) mas **não é chamado** em nenhuma rota de mutação.
- **Correção:** policies por papel, ou enforcement de role via `requireRole` nas rotas de mutação.

### 10. `billing_invoices` gravável pelo próprio tenant
- **Arquivo:** `packages/db/migrations/0006_billing.sql:22`
- **Problema:** policy de INSERT permite o restaurante forjar as próprias faturas.
- **Correção:** restringir INSERT/UPDATE a service-role.

### 11. Funções `security definer` sem `search_path`
- **Arquivo:** todas as migrations (ex.: `0001:496`, `0003`, `0004:100`, `0005:53`)
- **Problema:** vetor clássico de escalada de privilégio no Postgres/Supabase. O linter do Supabase reclama disso.
- **Correção:** adicionar `set search_path = public, pg_temp` em toda função `security definer`.

### 12. Jobs com atraso via `setTimeout`
- **Arquivo:** `services/api/src/modules/order-hooks.ts:69`
- **Problema:** feedback de +30min usa `setTimeout` em memória — some se o container reiniciar.
- **Correção:** usar BullMQ delayed job (a infra já existe).

### 13. Debounce do agente em memória
- **Arquivo:** `services/whatsapp/src/routes/inbound.ts:11`
- **Problema:** buffer em `Map` local. Perde mensagens em restart e quebra com múltiplas instâncias (o agente é single-instance de fato).
- **Correção:** mover o buffer de debounce para o Redis.

---

## 🟡 P2 — Robustez e qualidade

### 14. Erros engolidos em massa
- **Arquivos:** dezenas de `.catch(() => {})` e `const { data } =` descartando `error` — ex.: `orders.ts:9`, `apps/admin/app/(dashboard)/cardapio/page.tsx:53`, `clientes/page.tsx:27`, `analytics/page.tsx`.
- **Problema:** falha de banco vira "lista vazia" ou toast de sucesso falso.
- **Correção:** logar e tratar. Padronizar formato de resposta de erro (hoje `restaurants.ts:15` retorna erro com status 200).

### 15. `res.ok` nunca checado nos clients externos
- **Arquivo:** `services/ads-engine/src/meta/client.ts:10`, `ads-engine/src/google/client.ts:10`, `integrations/src/ninety9food/client.ts:12` (só o iFood checa)
- **Problema:** erro 4xx/5xx da API externa é tratado como dado de sucesso.
- **Correção:** checar `res.ok` e tratar a falha.

### 16. Validação Zod existe mas não é aplicada
- **Arquivo:** `packages/shared/src/validations.ts` (existe e é bom), mas o backend usa `request.body as any` em quase toda rota.
- **Correção:** aplicar os schemas que já existem nas rotas.

### 17. `onboarding` faz UPDATE sem escopo de tenant
- **Arquivo:** `apps/admin/app/onboarding/page.tsx:29,50`
- **Problema:** `.update().not("id","is",null)` atualiza **todas as linhas** que a RLS permitir. Perigoso se a RLS falhar.
- **Correção:** filtrar explicitamente por `restaurant_id`.

---

## 🔧 P3 — Engenharia de suporte (bloqueadores de produção real)

### 18. Containers rodam `pnpm dev` / `tsx watch` em "produção"
- **Arquivo:** todos os 7 Dockerfiles (`services/*/Dockerfile`, `apps/*/Dockerfile`)
- **Problema:** é file-watcher de desenvolvimento. Sem build de produção. Roda como `root`, sem `HEALTHCHECK`, não é multi-stage (carrega todo o `node_modules` de dev).
- **Correção:** multi-stage build → `tsc` → `CMD ["node","dist/server.js"]`, `USER node`, `HEALTHCHECK`.

### 19. `pnpm-lock.yaml` não versionado + `|| pnpm install`
- **Arquivo:** raiz do repo + todos os Dockerfiles (`RUN pnpm install --frozen-lockfile || pnpm install`)
- **Problema:** builds não reproduzíveis. O `--frozen-lockfile` é teatro porque o lock não existe e sempre cai no fallback.
- **Correção:** commitar o `pnpm-lock.yaml`, remover o `|| pnpm install`.

### 20. Zero testes, zero CI, zero lint
- **Problema:** Vitest está nas deps mas não há um único `*.test.ts`. Não há `.github/workflows`, ESLint, Prettier nem hooks. Scripts `lint`/`test` da raiz apontam para scripts inexistentes e quebram.
- **Correção (mínimo):** ESLint + Prettier; um workflow de CI (`pnpm install --frozen-lockfile && pnpm -r build && pnpm -r test`); e testes para as funções de **dinheiro**: `validate_coupon`, `credit_loyalty`, `redeem_loyalty`, `generate_monthly_invoice`.

### 21. docker-compose sem healthcheck / `service_healthy`
- **Arquivo:** `infra/docker-compose.yml`
- **Problema:** `depends_on` só espera o container iniciar, não ficar pronto — API/workers podem subir antes do Redis aceitar conexão. `version: "3.8"` obsoleto. Sem `restart: unless-stopped`.
- **Correção:** adicionar `healthcheck` (inclusive no Redis) e `depends_on: { condition: service_healthy }`.

---

## Sequência de execução recomendada

1. **P0 inteiro (1–6)** — habilita ter cliente real sem fraude/vazamento.
2. **#18 e #19** (build de produção + lockfile) — sem isso, nada que for corrigido roda de forma confiável.
3. **P1 (7–13)** — bugs de negócio.
4. **#20** (testes nas funções de dinheiro) — trava regressão nos pontos críticos.
5. **Restante de P2/P3.**

> **Os mais urgentes em termos absolutos são os itens 1, 2 e 3** — são as três portas para fraude financeira direta numa plataforma que processa pedidos pagos.

---

## Resumo por severidade

| Severidade | Itens | Tema |
|------------|-------|------|
| 🔴 P0 | 1–6 | Segurança e dinheiro |
| 🟠 P1 | 7–13 | Correção de negócio |
| 🟡 P2 | 14–17 | Robustez e qualidade |
| 🔧 P3 | 18–21 | Engenharia de suporte |
