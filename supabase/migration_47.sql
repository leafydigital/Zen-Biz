-- migration_47.sql — Razorpay account for collecting plan payments (set in the owner console /app)
-- Run in Supabase SQL Editor. Safe to run twice.
--
-- The secrets are stored ENCRYPTED and this table has RLS on with NO policies,
-- so only the server (service role) can read or write it — never the browser.

create table if not exists public.payment_gateway (
  provider text primary key,                 -- 'razorpay'
  key_id text,                               -- public key id (rzp_test_… / rzp_live_…)
  key_secret_enc text,                       -- encrypted
  webhook_secret_enc text,                   -- encrypted
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.payment_gateway enable row level security;
