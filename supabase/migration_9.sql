-- =============================================================================
-- ZEN BIZ — MIGRATION 9 (Starter / Professional / Business plans + payments)
-- =============================================================================
-- Renames the plan tiers: free -> starter, basic -> professional,
-- premium -> business. Existing accounts are moved over automatically so
-- nobody loses the access level they already had. Also adds billing_cycle,
-- plan_renews_at, and the subscription_payments table for Razorpay
-- checkout tracking.
--
-- Safe to run even if some of this already exists.
-- =============================================================================

-- Drop the old constraint FIRST, before touching any data — if a previous
-- run of this migration was interrupted partway through, some rows may
-- already show 'starter'/'professional'/'business' while the OLD
-- constraint (which never allowed those values) is technically still
-- attached, causing every subsequent statement here to fail. Dropping the
-- constraint up front makes this migration safe to re-run from any partial
-- state.
alter table public.profiles drop constraint if exists profiles_plan_check;

-- Now it's safe to move existing values across to the new naming.
update public.profiles set plan = 'starter' where plan = 'free';
update public.profiles set plan = 'professional' where plan = 'basic';
update public.profiles set plan = 'business' where plan = 'premium';

alter table public.profiles add constraint profiles_plan_check
  check (plan in ('starter', 'professional', 'business'));
alter table public.profiles alter column plan set default 'starter';

alter table public.profiles add column if not exists billing_cycle text
  check (billing_cycle in ('monthly', 'yearly'));
alter table public.profiles add column if not exists plan_renews_at timestamptz;

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  plan text not null check (plan in ('professional', 'business')),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  amount numeric(12, 2) not null,
  currency text not null default 'INR',
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscription_payments enable row level security;

drop policy if exists "Owners can view their own payments" on public.subscription_payments;
create policy "Owners can view their own payments"
  on public.subscription_payments for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own pending payment" on public.subscription_payments;
create policy "Owners can insert their own pending payment"
  on public.subscription_payments for insert with check (auth.uid() = owner_id);

drop trigger if exists set_updated_at on public.subscription_payments;
create trigger set_updated_at before update on public.subscription_payments
  for each row execute function public.set_updated_at();

