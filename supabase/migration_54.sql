-- migration_54.sql — Billing customers, loyalty points, UPI id (Billing / POS only, separate from invoice customers)
-- Run in Supabase SQL Editor. Safe to run twice.

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null default '',
  phone text not null,
  points numeric(12, 2) not null default 0,
  total_spent numeric(14, 2) not null default 0,
  visits integer not null default 0,
  last_visit timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, phone)
);

alter table public.billing_customers enable row level security;

drop policy if exists "Members can view billing_customers" on public.billing_customers;
create policy "Members can view billing_customers" on public.billing_customers
  for select using (public.is_business_member(business_id));
drop policy if exists "Members can insert billing_customers" on public.billing_customers;
create policy "Members can insert billing_customers" on public.billing_customers
  for insert with check (public.is_business_member(business_id));
drop policy if exists "Members can update billing_customers" on public.billing_customers;
create policy "Members can update billing_customers" on public.billing_customers
  for update using (public.is_business_member(business_id));
drop policy if exists "Members can delete billing_customers" on public.billing_customers;
create policy "Members can delete billing_customers" on public.billing_customers
  for delete using (public.is_business_member(business_id));

-- Which billing customer a bill belongs to, and the points earned / used on it.
alter table public.invoices
  add column if not exists billing_customer_id uuid references public.billing_customers(id) on delete set null,
  add column if not exists points_earned numeric(12, 2) not null default 0,
  add column if not exists points_redeemed numeric(12, 2) not null default 0;

create index if not exists invoices_billing_customer_idx on public.invoices (billing_customer_id);

-- Loyalty rules + UPI id: { loyaltyOn, earnPerAmount, earnPoints, pointValue, upiId }
alter table public.businesses add column if not exists billing_settings jsonb;

-- One atomic update after each bill: total spent, visits, points (never below 0), name, last visit.
create or replace function public.billing_customer_apply(
  p_id uuid, p_name text, p_spent numeric, p_points numeric
) returns void
language sql
security invoker
set search_path = public
as $$
  update public.billing_customers
  set name = case when coalesce(trim(p_name), '') <> '' then trim(p_name) else name end,
      total_spent = total_spent + coalesce(p_spent, 0),
      visits = visits + 1,
      points = greatest(0, points + coalesce(p_points, 0)),
      last_visit = now()
  where id = p_id;
$$;

grant execute on function public.billing_customer_apply(uuid, text, numeric, numeric) to authenticated;
