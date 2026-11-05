-- migration_48.sql — Discount codes at checkout: start date, exact use counting
-- Run in Supabase SQL Editor. Safe to run twice.

-- A code can start on a date (it expires with expires_at, which already exists).
alter table public.discount_codes
  add column if not exists starts_at timestamptz;

-- Every payment remembers which code it used. Uses are counted from these rows,
-- so "first 50 customers" is exact.
alter table public.subscription_payments
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric(12, 2) not null default 0,
  add column if not exists list_price numeric(12, 2);

create index if not exists subscription_payments_discount_code_idx
  on public.subscription_payments (discount_code)
  where discount_code is not null;
