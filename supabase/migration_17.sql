-- =============================================================================
-- ZEN BIZ — MIGRATION 17 (Multi-business architecture, part 1: schema)
-- =============================================================================
-- Introduces real multi-business support. Until now, one profiles row (tied
-- 1:1 to auth.users) WAS the business — every table's RLS checked
-- `auth.uid() = owner_id` directly. This migration:
--
--   1. Creates `businesses` — one row per business, holding everything that
--      is genuinely business-specific (name, address, GSTIN, logo, bank
--      details, document design, terms). A single login can now own or be
--      a member of more than one.
--   2. Creates `business_members` — who can access which business, and
--      with what role ('owner' or 'member'). This is the seed for the
--      Team/Users feature and for RLS membership checks everywhere else.
--   3. Backfills: for every existing profiles row, creates one `businesses`
--      row carrying over its business-shaped fields, and one
--      `business_members` row making that same user its owner. Existing
--      users lose nothing and keep exactly the access they had.
--   4. Adds `business_id` to every data table (products, customers,
--      invoices, invoice_items, quotations, quotation_items, suppliers,
--      purchases, purchase_items, delivery_challans,
--      delivery_challan_items) and backfills it from `owner_id`, via the
--      one business each existing owner now has.
--
-- RLS policy changes and NOT NULL enforcement are deliberately in
-- migration_18.sql, run only after this one and the app code have been
-- verified — splitting these apart means a partial failure here can't
-- leave any table's security policy in a half-migrated state.
--
-- Safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. businesses
-- ---------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null default '',
  business_type text not null default '',
  logo_url text,
  address text,
  state text,
  gst_number text,
  phone text,
  document_design jsonb not null default '{"paperSize": "a4", "style": "default", "fontSize": 10}'::jsonb,
  signature_url text,
  invoice_terms text,
  quotation_terms text,
  purchase_terms text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc_or_swift text,
  payment_qr_url text,
  default_currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

-- ---------------------------------------------------------------------------
-- 2. business_members
-- ---------------------------------------------------------------------------
create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (business_id, user_id)
);

alter table public.business_members enable row level security;

-- businesses policies reference business_members, so they're created here,
-- after both tables exist.
drop policy if exists "Members can view businesses they belong to" on public.businesses;
create policy "Members can view businesses they belong to"
  on public.businesses for select using (
    exists (
      select 1 from public.business_members
      where business_members.business_id = businesses.id
        and business_members.user_id = auth.uid()
    )
  );

drop policy if exists "Owners can insert their own businesses" on public.businesses;
create policy "Owners can insert their own businesses"
  on public.businesses for insert with check (auth.uid() = owner_id);

drop policy if exists "Owners can update their own businesses" on public.businesses;
create policy "Owners can update their own businesses"
  on public.businesses for update using (auth.uid() = owner_id);

drop policy if exists "Owners can delete their own businesses" on public.businesses;
create policy "Owners can delete their own businesses"
  on public.businesses for delete using (auth.uid() = owner_id);

drop policy if exists "Members can view their own memberships" on public.business_members;
create policy "Members can view their own memberships"
  on public.business_members for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.businesses
      where businesses.id = business_members.business_id
        and businesses.owner_id = auth.uid()
    )
  );

drop policy if exists "Business owners can add members" on public.business_members;
create policy "Business owners can add members"
  on public.business_members for insert with check (
    exists (
      select 1 from public.businesses
      where businesses.id = business_members.business_id
        and businesses.owner_id = auth.uid()
    )
  );

drop policy if exists "Business owners can remove members" on public.business_members;
create policy "Business owners can remove members"
  on public.business_members for delete using (
    exists (
      select 1 from public.businesses
      where businesses.id = business_members.business_id
        and businesses.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Backfill: one business + one owner membership per existing profile
-- ---------------------------------------------------------------------------
insert into public.businesses (
  id, owner_id, business_name, business_type, logo_url, address, state,
  gst_number, phone, document_design, signature_url, invoice_terms,
  quotation_terms, purchase_terms, bank_name, bank_account_name,
  bank_account_number, bank_ifsc_or_swift, payment_qr_url, default_currency
)
select
  gen_random_uuid(), p.id, p.business_name, p.business_type, p.logo_url,
  p.address, p.state, p.gst_number, p.phone, p.document_design,
  p.signature_url, p.invoice_terms, p.quotation_terms, p.purchase_terms,
  p.bank_name, p.bank_account_name, p.bank_account_number,
  p.bank_ifsc_or_swift, p.payment_qr_url, p.default_currency
from public.profiles p
where not exists (
  select 1 from public.businesses b where b.owner_id = p.id
);

insert into public.business_members (business_id, user_id, role)
select b.id, b.owner_id, 'owner'
from public.businesses b
where not exists (
  select 1 from public.business_members bm
  where bm.business_id = b.id and bm.user_id = b.owner_id
);

-- ---------------------------------------------------------------------------
-- 4. business_id on every data table, backfilled from each row's existing
--    owner_id via the one business that owner now has (their first/only
--    one from the backfill above).
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'customers', 'invoices', 'invoice_items', 'quotations',
    'quotation_items', 'suppliers', 'purchases', 'purchase_items',
    'delivery_challans', 'delivery_challan_items'
  ]
  loop
    execute format('alter table public.%I add column if not exists business_id uuid references public.businesses (id) on delete cascade', t);
    execute format(
      'update public.%I t set business_id = b.id
       from public.businesses b
       where t.business_id is null and b.owner_id = t.owner_id',
      t
    );
  end loop;
end $$;
