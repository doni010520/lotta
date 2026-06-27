-- ── Sprint 4: níveis de fidelidade + opt-out de marketing ──

-- Níveis (tiers) configuráveis no programa: [{ "name":"Ouro", "min":500, "perk":"frete grátis" }]
alter table public.loyalty_programs
  add column if not exists tiers jsonb not null default '[]'::jsonb;

-- Total acumulado ao longo da vida (não diminui no resgate) — base para o nível do cliente
alter table public.loyalty_balances
  add column if not exists lifetime_earned numeric(12,2) not null default 0;

-- Opt-out de marketing (quando o cliente responde SAIR/PARAR no WhatsApp)
alter table public.customers
  add column if not exists opted_out_at timestamptz;

-- credit_loyalty passa a acumular lifetime_earned (recriação da função do 0005)
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

  insert into public.loyalty_balances (restaurant_id, customer_id, balance)
  values (p_restaurant_id, p_customer_id, 0)
  on conflict (restaurant_id, customer_id) do nothing;

  update public.loyalty_balances
  set balance = balance + v_credit,
      lifetime_earned = lifetime_earned + v_credit,
      updated_at = now()
  where restaurant_id = p_restaurant_id and customer_id = p_customer_id
  returning balance into v_balance;

  if v_program.points_expire_days > 0 then
    v_expires := now() + (v_program.points_expire_days || ' days')::interval;
  end if;

  insert into public.loyalty_transactions (restaurant_id, customer_id, type, amount, balance_after, reason, reference_type, reference_id, expires_at)
  values (p_restaurant_id, p_customer_id, 'credit', v_credit, v_balance,
    case when v_program.type = 'points' then 'Pontos pelo pedido' else 'Cashback pelo pedido' end,
    'order', p_order_id, v_expires);

  return v_credit;
end;
$$ language plpgsql security definer;
