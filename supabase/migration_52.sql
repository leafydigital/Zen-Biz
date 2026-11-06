-- migration_52.sql — low-stock limit per business (Settings > Stock)
-- Run in Supabase SQL Editor. Safe to run twice.
alter table public.businesses
  add column if not exists low_stock_level integer not null default 5;
