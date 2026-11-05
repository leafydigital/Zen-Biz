-- migration_45.sql — Barcode label settings (paper size, columns, barcode design)
-- Run in Supabase SQL Editor. Safe to run twice.

alter table public.businesses
  add column if not exists barcode_settings jsonb;
