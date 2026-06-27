-- ── Sprint 2: resgate de fidelidade no checkout do cliente ──
-- Guarda o valor de saldo (cashback) resgatado no pedido, separado do desconto de cupom.

alter table public.orders
  add column if not exists loyalty_redeemed numeric(10,2) not null default 0;
