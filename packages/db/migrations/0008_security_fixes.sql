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
