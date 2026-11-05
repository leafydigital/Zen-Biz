-- migration_46.sql — Saved item category list (add / rename / delete from Items)
-- Run in Supabase SQL Editor. Safe to run twice.

alter table public.businesses
  add column if not exists product_categories jsonb not null default '[]'::jsonb;
