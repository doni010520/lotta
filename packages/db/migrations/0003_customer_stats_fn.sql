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
