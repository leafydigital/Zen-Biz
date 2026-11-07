-- migration_56.sql — Income & Expenses (salary, petrol, rent, outside income...)
-- Run once in the Supabase SQL editor. Safe to run twice.

create table if not exists public.cash_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  category text not null default 'Other',
  amount numeric(12, 2) not null check (amount >= 0),
  entry_date date not null default current_date,
  note text,
  -- Repeats on the same day every month, from entry_date until repeat_until (or forever).
  repeat_monthly boolean not null default false,
  repeat_until date,
  created_at timestamptz not null default now()
);

create index if not exists cash_entries_business_date_idx on public.cash_entries (business_id, entry_date);

alter table public.cash_entries enable row level security;

drop policy if exists "Members can view cash_entries" on public.cash_entries;
create policy "Members can view cash_entries" on public.cash_entries
  for select using (public.is_business_member(business_id));
drop policy if exists "Members can insert cash_entries" on public.cash_entries;
create policy "Members can insert cash_entries" on public.cash_entries
  for insert with check (public.is_business_member(business_id));
drop policy if exists "Members can update cash_entries" on public.cash_entries;
create policy "Members can update cash_entries" on public.cash_entries
  for update using (public.is_business_member(business_id));
drop policy if exists "Members can delete cash_entries" on public.cash_entries;
create policy "Members can delete cash_entries" on public.cash_entries
  for delete using (public.is_business_member(business_id));
