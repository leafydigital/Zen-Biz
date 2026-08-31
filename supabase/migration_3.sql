-- =============================================================================
-- ZEN BIZ — MIGRATION 3 (run this if you already ran schema.sql or
-- migration_2.sql before Purchases, Suppliers, and automatic stock
-- adjustment existed)
-- =============================================================================
-- Adds: Suppliers, Purchases, Purchase Items, Quotation Items, and the
-- automatic stock-adjustment triggers (buying increases stock, selling
-- decreases it — only for products that track stock).
--
-- Safe to run even if some of this already exists; every statement below
-- uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS so nothing is duplicated
-- and no existing data is touched.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Quotation line items
-- ---------------------------------------------------------------------------
create table if not exists public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
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
-- Suppliers
-- ---------------------------------------------------------------------------
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
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
-- Purchases
-- ---------------------------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  purchase_number text not null,
  purchase_date date not null default current_date,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'cancelled')),
  subtotal numeric(12, 2) not null default 0,
  gst_enabled boolean not null default false,
  gst_percent numeric(5, 2) not null default 0,
  gst_amount numeric(12, 2) not null default 0,
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
-- Purchase line items
-- ---------------------------------------------------------------------------
create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
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
-- updated_at triggers for the new tables
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on public.suppliers;
create trigger set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.purchases;
create trigger set_updated_at before update on public.purchases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Automatic stock adjustment: buying increases stock, selling decreases it.
-- Only products with a stock_qty set (not null) are affected.
-- ---------------------------------------------------------------------------
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
