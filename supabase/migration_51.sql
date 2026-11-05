-- migration_51.sql — e-invoice (IRN) details saved on invoices
-- Run in Supabase SQL Editor. Safe to run twice.
alter table public.invoices
  add column if not exists irn text,
  add column if not exists irn_ack_no text,
  add column if not exists irn_date date;
