-- migration_50.sql — E-way bill details on invoices (Professional and Business plans)
-- Run in Supabase SQL Editor. Safe to run twice.
--
-- These only STORE the details of an e-way bill made on the GST portal; Zen Biz
-- prints them on the invoice. (vehicle_number and transport_name already exist.)

alter table public.invoices
  add column if not exists eway_bill_number text,
  add column if not exists eway_bill_date date,
  add column if not exists eway_valid_until date,
  add column if not exists eway_distance_km numeric,
  add column if not exists eway_transporter_id text;
