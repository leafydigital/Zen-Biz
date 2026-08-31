-- =============================================================================
-- ZEN BIZ — MIGRATION 8 (Free / Basic / Premium plans, Delivery Challan)
-- =============================================================================
-- Changes the plan model from free/paid to three tiers: free, basic,
-- premium. Existing accounts on the old 'paid' value are moved to
-- 'premium' automatically (safest default — nobody loses access they had).
-- Also adds Delivery Challans (Basic plan and above) and a counter for the
-- Free plan's 3-edit limit on Terms & Conditions / Signature.
--
-- Safe to run even if some of this already exists.
-- =============================================================================

update public.profiles set plan = 'premium' where plan = 'paid';

alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'basic', 'premium'));

alter table public.profiles add column if not exists terms_signature_edit_count integer not null default 0;

create table if not exists public.delivery_challans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  challan_number text not null,
  challan_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft', 'dispatched', 'delivered')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, challan_number)
);

alter table public.delivery_challans enable row level security;

drop policy if exists "Owners can view their own delivery challans" on public.delivery_challans;
create policy "Owners can view their own delivery challans"
  on public.delivery_challans for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own delivery challans" on public.delivery_challans;
create policy "Owners can insert their own delivery challans"
  on public.delivery_challans for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own delivery challans" on public.delivery_challans;
create policy "Owners can update their own delivery challans"
  on public.delivery_challans for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own delivery challans" on public.delivery_challans;
create policy "Owners can delete their own delivery challans"
  on public.delivery_challans for delete using (auth.uid() = owner_id);

create table if not exists public.delivery_challan_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  challan_id uuid not null references public.delivery_challans (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit text not null default 'item',
  item_code text,
  created_at timestamptz not null default now()
);

alter table public.delivery_challan_items enable row level security;

drop policy if exists "Owners can view their own delivery challan items" on public.delivery_challan_items;
create policy "Owners can view their own delivery challan items"
  on public.delivery_challan_items for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own delivery challan items" on public.delivery_challan_items;
create policy "Owners can insert their own delivery challan items"
  on public.delivery_challan_items for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own delivery challan items" on public.delivery_challan_items;
create policy "Owners can update their own delivery challan items"
  on public.delivery_challan_items for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own delivery challan items" on public.delivery_challan_items;
create policy "Owners can delete their own delivery challan items"
  on public.delivery_challan_items for delete using (auth.uid() = owner_id);

drop trigger if exists set_updated_at on public.delivery_challans;
create trigger set_updated_at before update on public.delivery_challans
  for each row execute function public.set_updated_at();
