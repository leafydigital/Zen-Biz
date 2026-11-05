-- migration_51.sql — E-way bill API login (GSP) saved per business
-- Run in Supabase SQL Editor. Safe to run twice.
--
-- The password is stored ENCRYPTED and this table has RLS on with NO policies,
-- so only the server (service role) can read or write it — never the browser.

create table if not exists public.eway_credentials (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  api_username text not null,
  api_password_enc text not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

alter table public.eway_credentials enable row level security;
