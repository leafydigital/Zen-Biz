-- migration_49.sql — Payment history: cancelled status + failure reason
-- Run in Supabase SQL Editor. Safe to run twice.
--
-- 'cancelled' = a checkout that was replaced by a newer one (so it is not shown as a failed payment).
-- failure_reason = the reason Razorpay gave when a payment failed.

alter table public.subscription_payments
  drop constraint if exists subscription_payments_status_check;
alter table public.subscription_payments
  add constraint subscription_payments_status_check
  check (status in ('created', 'paid', 'failed', 'cancelled'));

alter table public.subscription_payments
  add column if not exists failure_reason text;

create index if not exists subscription_payments_created_idx
  on public.subscription_payments (created_at desc);
