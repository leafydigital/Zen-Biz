-- =============================================================================
-- ZEN BIZ — DATABASE SCHEMA
-- =============================================================================
-- Run this once in your Supabase project's SQL Editor (Project > SQL Editor).
--
-- SECURITY MODEL (important — read this):
-- Every business table has an `owner_id` column pointing to the signed-in
-- user (auth.users.id). Row Level Security (RLS) policies below make sure
-- that NO ROW is ever visible or writable except by its own owner_id.
--
-- This is enforced by the database itself — not by the app's UI. So even if
-- two different Gmail accounts log into the same browser, or someone calls
-- the API directly, Supabase will only ever return that signed-in user's own
-- rows. This is what makes "one Gmail sees only its own data, another Gmail
-- starts fresh" actually secure rather than just a UI trick.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES — one row per signed-in owner, created right after first login
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_name text not null default '',
  business_type text not null default '',       -- free text now (dropdown + "Other" in the UI)
  logo_url text,
  address text,
  -- The business's own state — used to compare against a customer's state
  -- for GST place-of-supply logic: same state splits tax into CGST+SGST,
  -- different state charges IGST instead.
  state text,
  gst_number text,
  phone text,
  plan text not null default 'starter' check (plan in ('starter', 'professional', 'business')),
  billing_cycle text check (billing_cycle in ('monthly', 'yearly')),
  plan_renews_at timestamptz,
  onboarding_complete boolean not null default false,
  -- The app's display language for this owner — menus, buttons, and
  -- system messages. Persisted here (not just localStorage) so it
  -- follows the person across devices and survives logout/login.
  language text not null default 'en',
  -- Paper size, style, font size, and signature/seal are shared across
  -- every document type (Invoice, Quotation, Purchase) — one setting
  -- instead of repeating the same picker three times.
  document_design jsonb not null default '{"paperSize": "a4", "style": "default", "fontSize": 10}'::jsonb,
  signature_url text,
  -- Terms & Conditions stay separate per document type, since wording
  -- genuinely differs (e.g. payment terms on an invoice vs delivery terms
  -- on a purchase).
  invoice_terms text,
  quotation_terms text,
  purchase_terms text,
  -- Bank details and QR code are shared business-wide, shown on every
  -- document's PDF when filled in. Both optional.
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  bank_ifsc_or_swift text,
  payment_qr_url text,
  -- Default currency suggested when starting a new invoice/quotation/
  -- purchase — the actual currency is chosen per-document, so this is just
  -- a convenience default, not a hard business-wide setting.
  default_currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Owners can view their own profile" on public.profiles;
create policy "Owners can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Owners can insert their own profile" on public.profiles;
create policy "Owners can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Owners can update their own profile" on public.profiles;
create policy "Owners can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. PRODUCTS / SERVICES catalog
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  unit text not null default 'item',   -- e.g. 'item', 'package', 'gram', 'service'
  stock_qty numeric(12, 2),            -- null = not stock-tracked (e.g. services/packages)
  category text,
  item_code text,                      -- your own SKU / reference code, free to use
  hsn_code text,                       -- GST HSN/SAC code — printing this on documents is a paid feature
  tax_percent numeric(5, 2) not null default 0,  -- default tax rate, auto-fills onto invoice/quotation/purchase lines
  image_url text,                      -- optional product photo
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Owners can view their own products" on public.products;
create policy "Owners can view their own products"
  on public.products for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own products" on public.products;
create policy "Owners can insert their own products"
  on public.products for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own products" on public.products;
create policy "Owners can update their own products"
  on public.products for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own products" on public.products;
create policy "Owners can delete their own products"
  on public.products for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 3. CUSTOMERS
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  -- Customer's state — compared against the business's own state (see
  -- profiles.state) to decide CGST+SGST vs IGST on invoices.
  state text,
  gstin text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;

drop policy if exists "Owners can view their own customers" on public.customers;
create policy "Owners can view their own customers"
  on public.customers for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own customers" on public.customers;
create policy "Owners can insert their own customers"
  on public.customers for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own customers" on public.customers;
create policy "Owners can update their own customers"
  on public.customers for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own customers" on public.customers;
create policy "Owners can delete their own customers"
  on public.customers for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 4. INVOICES (free tier: no GST fields applied yet, but columns exist ready
--    for the paid GST feature so no future migration/data-loss is needed)
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  -- 'invoice' is an official, numbered invoice — it counts toward the
  -- monthly plan limit and can be downloaded/printed/shared. A
  -- 'billing_record' is the same shape of data saved for internal
  -- reference only: no invoice number yet, doesn't touch the limit, and
  -- has no export/print/share affordances in the UI. Converting one to
  -- the other is just flipping this column plus assigning invoice_number.
  record_type text not null default 'invoice' check (record_type in ('invoice', 'billing_record')),
  -- Set only on a billing_record, once it's been converted — points at
  -- the invoice row that resulted, so the UI can show "View Invoice"
  -- and refuse to convert the same record twice.
  converted_invoice_id uuid references public.invoices (id) on delete set null,
  invoice_number text not null,
  invoice_date date not null default current_date,
  due_date date,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'cancelled')),
  payment_method text check (payment_method in ('cash', 'upi', 'bank', 'credit_card', 'cheque', 'other')),
  -- Only meaningful when status = 'partial': how much has actually been
  -- received so far. amount_due is derived (total - amount_paid) rather
  -- than stored, to avoid the two ever drifting out of sync.
  amount_paid numeric(12, 2) not null default 0,
  currency text not null default 'INR',
  -- Ship To is optional and separate from the customer's own address (Bill
  -- To) — useful when goods are delivered somewhere other than the billing
  -- address. Left blank, the PDF just shows Bill To only.
  ship_to_name text,
  ship_to_address text,
  -- Logistics fields for goods being physically transported — all
  -- optional, shown on the PDF only when filled in.
  delivery_address text,
  vehicle_number text,
  transport_name text,
  -- Tax type controls how the line-item totals are read: Inclusive means
  -- the entered rate already contains GST, Exclusive adds GST on top,
  -- Exempt/Non-GST both charge zero tax but are labelled differently for
  -- filing purposes.
  tax_type text not null default 'exclusive' check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst', 'gst', 'tax', 'non_tax')),
  -- The state GST was actually charged for, snapshotted at save time (not
  -- looked up live from the customer later) — this is what decided
  -- CGST+SGST vs IGST below, and it stays fixed even if the business's or
  -- customer's state is edited afterward.
  place_of_supply_state text,
  subtotal numeric(12, 2) not null default 0,
  gst_enabled boolean not null default false,
  gst_percent numeric(5, 2) not null default 0,
  gst_amount numeric(12, 2) not null default 0,
  -- Same-state sales split gst_amount into these two (each roughly half);
  -- different-state sales put the full amount in igst_amount instead and
  -- leave these at zero. Only one of the two paths is ever non-zero.
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  igst_amount numeric(12, 2) not null default 0,
  round_off numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, invoice_number)
);

alter table public.invoices enable row level security;

drop policy if exists "Owners can view their own invoices" on public.invoices;
create policy "Owners can view their own invoices"
  on public.invoices for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own invoices" on public.invoices;
create policy "Owners can insert their own invoices"
  on public.invoices for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own invoices" on public.invoices;
create policy "Owners can update their own invoices"
  on public.invoices for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own invoices" on public.invoices;
create policy "Owners can delete their own invoices"
  on public.invoices for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 5. INVOICE LINE ITEMS
-- ---------------------------------------------------------------------------
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit text not null default 'item',
  item_code text,
  hsn_code text,
  unit_price numeric(12, 2) not null default 0,
  -- Per-line discount, applied before tax — e.g. 10 means 10% off this
  -- line's (quantity × unit_price) before GST is calculated on top.
  discount_percent numeric(5, 2) not null default 0,
  -- Per-line tax rate — independent of the invoice-level GST toggle, so a
  -- business can show a tax % per item (matching common invoice formats)
  -- even before full GST billing is turned on for their plan.
  tax_percent numeric(5, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.invoice_items enable row level security;

drop policy if exists "Owners can view their own invoice items" on public.invoice_items;
create policy "Owners can view their own invoice items"
  on public.invoice_items for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own invoice items" on public.invoice_items;
create policy "Owners can insert their own invoice items"
  on public.invoice_items for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own invoice items" on public.invoice_items;
create policy "Owners can update their own invoice items"
  on public.invoice_items for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own invoice items" on public.invoice_items;
create policy "Owners can delete their own invoice items"
  on public.invoice_items for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 6. QUOTATIONS — table exists now (paid feature, locked in the app UI for
--    the free plan) so nothing needs to be migrated later.
-- ---------------------------------------------------------------------------
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  quotation_number text not null,
  quotation_date date not null default current_date,
  valid_until date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  currency text not null default 'INR',
  ship_to_name text,
  ship_to_address text,
  delivery_address text,
  vehicle_number text,
  transport_name text,
  tax_type text not null default 'exclusive' check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst', 'gst', 'tax', 'non_tax')),
  place_of_supply_state text,
  subtotal numeric(12, 2) not null default 0,
  gst_enabled boolean not null default false,
  gst_percent numeric(5, 2) not null default 0,
  gst_amount numeric(12, 2) not null default 0,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  igst_amount numeric(12, 2) not null default 0,
  round_off numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, quotation_number)
);

alter table public.quotations enable row level security;

drop policy if exists "Owners can view their own quotations" on public.quotations;
create policy "Owners can view their own quotations"
  on public.quotations for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own quotations" on public.quotations;
create policy "Owners can insert their own quotations"
  on public.quotations for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own quotations" on public.quotations;
create policy "Owners can update their own quotations"
  on public.quotations for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own quotations" on public.quotations;
create policy "Owners can delete their own quotations"
  on public.quotations for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 6b. QUOTATION LINE ITEMS
-- ---------------------------------------------------------------------------
create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit text not null default 'item',
  item_code text,
  hsn_code text,
  unit_price numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  tax_percent numeric(5, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.quotation_items enable row level security;

drop policy if exists "Owners can view their own quotation items" on public.quotation_items;
create policy "Owners can view their own quotation items"
  on public.quotation_items for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own quotation items" on public.quotation_items;
create policy "Owners can insert their own quotation items"
  on public.quotation_items for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own quotation items" on public.quotation_items;
create policy "Owners can update their own quotation items"
  on public.quotation_items for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own quotation items" on public.quotation_items;
create policy "Owners can delete their own quotation items"
  on public.quotation_items for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 6c. SUPPLIERS — who you buy from (mirror of Customers, but for purchases)
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  state text,
  gstin text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

drop policy if exists "Owners can view their own suppliers" on public.suppliers;
create policy "Owners can view their own suppliers"
  on public.suppliers for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own suppliers" on public.suppliers;
create policy "Owners can insert their own suppliers"
  on public.suppliers for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own suppliers" on public.suppliers;
create policy "Owners can update their own suppliers"
  on public.suppliers for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own suppliers" on public.suppliers;
create policy "Owners can delete their own suppliers"
  on public.suppliers for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 6d. PURCHASES — stock/goods bought in from suppliers. GST fields exist
--     now (paid feature later) mirroring the Invoices table, so nothing
--     needs to be migrated when GST billing is unlocked.
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  purchase_number text not null,
  purchase_date date not null default current_date,
  status text not null default 'unpaid' check (status in ('unpaid', 'partial', 'paid', 'cancelled')),
  payment_method text check (payment_method in ('cash', 'upi', 'bank', 'credit_card', 'cheque', 'other')),
  amount_paid numeric(12, 2) not null default 0,
  currency text not null default 'INR',
  delivery_address text,
  vehicle_number text,
  transport_name text,
  tax_type text not null default 'exclusive' check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst', 'gst', 'tax', 'non_tax')),
  place_of_supply_state text,
  subtotal numeric(12, 2) not null default 0,
  gst_enabled boolean not null default false,
  gst_percent numeric(5, 2) not null default 0,
  gst_amount numeric(12, 2) not null default 0,
  cgst_amount numeric(12, 2) not null default 0,
  sgst_amount numeric(12, 2) not null default 0,
  igst_amount numeric(12, 2) not null default 0,
  round_off numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, purchase_number)
);

alter table public.purchases enable row level security;

drop policy if exists "Owners can view their own purchases" on public.purchases;
create policy "Owners can view their own purchases"
  on public.purchases for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own purchases" on public.purchases;
create policy "Owners can insert their own purchases"
  on public.purchases for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own purchases" on public.purchases;
create policy "Owners can update their own purchases"
  on public.purchases for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own purchases" on public.purchases;
create policy "Owners can delete their own purchases"
  on public.purchases for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 6e. PURCHASE LINE ITEMS — each line increases the matching product's
--     stock_qty automatically via trigger (see section 10). Only products
--     that track stock (stock_qty is not null) are affected — a travel
--     package or service with no stock_qty is left untouched, since it was
--     never meant to be counted as inventory.
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit text not null default 'item',
  item_code text,
  hsn_code text,
  unit_price numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  tax_percent numeric(5, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.purchase_items enable row level security;

drop policy if exists "Owners can view their own purchase items" on public.purchase_items;
create policy "Owners can view their own purchase items"
  on public.purchase_items for select using (auth.uid() = owner_id);
drop policy if exists "Owners can insert their own purchase items" on public.purchase_items;
create policy "Owners can insert their own purchase items"
  on public.purchase_items for insert with check (auth.uid() = owner_id);
drop policy if exists "Owners can update their own purchase items" on public.purchase_items;
create policy "Owners can update their own purchase items"
  on public.purchase_items for update using (auth.uid() = owner_id);
drop policy if exists "Owners can delete their own purchase items" on public.purchase_items;
create policy "Owners can delete their own purchase items"
  on public.purchase_items for delete using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- 6f. DELIVERY CHALLANS — a dispatch note for goods sent out ahead of or
--     without an invoice (Basic plan and above). Doesn't move stock or GST
--     on its own; it's a paperwork record of what physically went out.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 6g. DELIVERY CHALLAN LINE ITEMS — no unit_price/line_total, since a
--     challan tracks quantities dispatched, not amounts billed.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 7. Keep updated_at fresh automatically
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.customers;
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.invoices;
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.quotations;
create trigger set_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.suppliers;
create trigger set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.purchases;
create trigger set_updated_at before update on public.purchases
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.delivery_challans;
create trigger set_updated_at before update on public.delivery_challans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7b. AUTOMATIC STOCK ADJUSTMENT
-- ---------------------------------------------------------------------------
-- Buying stock (a purchase line item) increases the matching product's
-- stock_qty. Selling stock (an invoice line item) decreases it. Products
-- with stock_qty = null are never touched — that's how a travel package or
-- a service opts out of inventory tracking entirely, since it was set up
-- without a stock count in the first place. Deleting a purchase or invoice
-- line item reverses the adjustment, so edits and corrections stay accurate.
create or replace function public.adjust_stock_on_purchase()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if new.product_id is not null then
      update public.products
      set stock_qty = stock_qty + new.quantity
      where id = new.product_id and stock_qty is not null;
    end if;
  elsif (tg_op = 'DELETE') then
    if old.product_id is not null then
      update public.products
      set stock_qty = stock_qty - old.quantity
      where id = old.product_id and stock_qty is not null;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_purchase_item_change on public.purchase_items;
create trigger on_purchase_item_change
  after insert or delete on public.purchase_items
  for each row execute function public.adjust_stock_on_purchase();

create or replace function public.adjust_stock_on_sale()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    if new.product_id is not null then
      update public.products
      set stock_qty = stock_qty - new.quantity
      where id = new.product_id and stock_qty is not null;
    end if;
  elsif (tg_op = 'DELETE') then
    if old.product_id is not null then
      update public.products
      set stock_qty = stock_qty + old.quantity
      where id = old.product_id and stock_qty is not null;
    end if;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists on_invoice_item_change on public.invoice_items;
create trigger on_invoice_item_change
  after insert or delete on public.invoice_items
  for each row execute function public.adjust_stock_on_sale();

-- ---------------------------------------------------------------------------
-- 8. STORAGE — bucket for business logos, with the same per-owner privacy
--    rule as every other table (each owner can only manage their own file).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view logos (public bucket)" on storage.objects;
create policy "Anyone can view logos (public bucket)"
  on storage.objects for select
  using (bucket_id = 'business-logos');

drop policy if exists "Owners can upload their own logo" on storage.objects;
create policy "Owners can upload their own logo"
  on storage.objects for insert
  with check (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can update their own logo" on storage.objects;
create policy "Owners can update their own logo"
  on storage.objects for update
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can delete their own logo" on storage.objects;
create policy "Owners can delete their own logo"
  on storage.objects for delete
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 8b. STORAGE — bucket for signature/seal images, same per-owner rule.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view signatures (public bucket)" on storage.objects;
create policy "Anyone can view signatures (public bucket)"
  on storage.objects for select
  using (bucket_id = 'signatures');

drop policy if exists "Owners can upload their own signature" on storage.objects;
create policy "Owners can upload their own signature"
  on storage.objects for insert
  with check (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can update their own signature" on storage.objects;
create policy "Owners can update their own signature"
  on storage.objects for update
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can delete their own signature" on storage.objects;
create policy "Owners can delete their own signature"
  on storage.objects for delete
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 8bb. STORAGE — bucket for payment QR code images, same per-owner rule.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-qr', 'payment-qr', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view payment QR codes (public bucket)" on storage.objects;
create policy "Anyone can view payment QR codes (public bucket)"
  on storage.objects for select
  using (bucket_id = 'payment-qr');

drop policy if exists "Owners can upload their own payment QR code" on storage.objects;
create policy "Owners can upload their own payment QR code"
  on storage.objects for insert
  with check (bucket_id = 'payment-qr' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can update their own payment QR code" on storage.objects;
create policy "Owners can update their own payment QR code"
  on storage.objects for update
  using (bucket_id = 'payment-qr' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can delete their own payment QR code" on storage.objects;
create policy "Owners can delete their own payment QR code"
  on storage.objects for delete
  using (bucket_id = 'payment-qr' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 8bc. STORAGE — bucket for product photos, same per-owner rule.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view product images (public bucket)" on storage.objects;
create policy "Anyone can view product images (public bucket)"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Owners can upload their own product images" on storage.objects;
create policy "Owners can upload their own product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can update their own product images" on storage.objects;
create policy "Owners can update their own product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can delete their own product images" on storage.objects;
create policy "Owners can delete their own product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 8c. SUBSCRIPTION PAYMENTS — one row per Razorpay order, created when the
--     owner starts a checkout and updated by the webhook once Razorpay
--     confirms payment. Kept even after the order completes, as a receipt
--     history. Payment verification happens server-side only (webhook +
--     signature check) — nothing here is writable by the browser directly
--     except creating the initial pending order.
-- ---------------------------------------------------------------------------
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
-- No update/delete policy for regular users: only the webhook (via the
-- service role key, which bypasses RLS entirely) marks a payment as paid or
-- failed, so a browser can never mark its own payment as successful.

drop trigger if exists set_updated_at on public.subscription_payments;
create trigger set_updated_at before update on public.subscription_payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. Auto-create a blank profile row the moment someone signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, business_name, onboarding_complete)
  values (new.id, '', false)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
