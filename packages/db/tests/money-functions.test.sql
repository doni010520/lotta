-- Test: validate_coupon
-- Run these against a Supabase test database after seeding

-- Setup
insert into public.coupons (restaurant_id, code, type, value, min_order, max_uses, is_active)
values ('00000000-0000-0000-0000-000000000001', 'TEST10', 'percent', 10, 50, 5, true);

-- Test 1: Valid coupon
select * from public.validate_coupon(
  '00000000-0000-0000-0000-000000000001', 'TEST10', 100, null
);
-- Expected: valid=true, discount=10.00

-- Test 2: Below min order
select * from public.validate_coupon(
  '00000000-0000-0000-0000-000000000001', 'TEST10', 30, null
);
-- Expected: valid=false, error contains "mínimo"

-- Test 3: Invalid code
select * from public.validate_coupon(
  '00000000-0000-0000-0000-000000000001', 'FAKE', 100, null
);
-- Expected: valid=false, error contains "não encontrado"

-- Test: credit_loyalty
insert into public.loyalty_programs (restaurant_id, type, points_per_real, is_active)
values ('00000000-0000-0000-0000-000000000001', 'points', 1, true)
on conflict do nothing;

select public.credit_loyalty(
  '00000000-0000-0000-0000-000000000001',
  (select id from public.customers where phone = '71988887777' limit 1),
  '00000000-0000-0000-0000-000000000099',
  100.00
);
-- Expected: returns 100 (points)

-- Test: generate_monthly_invoice
select public.generate_monthly_invoice(
  '00000000-0000-0000-0000-000000000001',
  '2025-01-01'::date
);
-- Expected: returns invoice UUID, amount = 4% of delivered orders revenue

-- Cleanup
delete from public.coupons where code = 'TEST10';
