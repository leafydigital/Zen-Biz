-- migration_53.sql — low-stock limit per unit (edited inside the Stock page)
-- Run in Supabase SQL Editor. Safe to run twice. Also makes sure migration_52's column exists.
alter table public.businesses
  add column if not exists low_stock_level integer not null default 5,
  add column if not exists low_stock_limits jsonb;
