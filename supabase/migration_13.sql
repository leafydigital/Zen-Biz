-- =============================================================================
-- ZEN BIZ — MIGRATION 13 (GST state logic, richer payment status, discount,
-- delivery/transport fields — the "Create Invoice" redesign)
-- =============================================================================
-- Adds:
-- - state on profiles (business's own state) and customers/suppliers
--   (their state) — compared to decide CGST+SGST (same state) vs IGST
--   (different state)
-- - gstin on customers and suppliers
-- - Payment status gains 'partial', with amount_paid tracked (amount due
--   is derived as total - amount_paid, not stored)
-- - Payment method gains 'upi' and 'credit_card'
-- - tax_type (inclusive/exclusive/exempt/non_gst) and place_of_supply_state
--   (snapshotted at save time) on invoices, quotations, purchases
-- - cgst_amount / sgst_amount / igst_amount / round_off, split out from
--   the existing gst_amount
-- - delivery_address / vehicle_number / transport_name on invoices,
--   quotations, purchases
-- - discount_percent on every line item table
--
-- Safe to run even if some of this already exists. Existing 'unpaid' /
-- 'paid' / 'cancelled' statuses are untouched — 'partial' is just a new
-- option alongside them.
-- =============================================================================

-- ---------- profiles ----------
alter table public.profiles add column if not exists state text;

-- ---------- customers ----------
alter table public.customers add column if not exists state text;
alter table public.customers add column if not exists gstin text;

-- ---------- suppliers ----------
alter table public.suppliers add column if not exists state text;
alter table public.suppliers add column if not exists gstin text;

-- ---------- invoices ----------
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check
  check (status in ('unpaid', 'partial', 'paid', 'cancelled'));

alter table public.invoices drop constraint if exists invoices_payment_method_check;
alter table public.invoices add constraint invoices_payment_method_check
  check (payment_method in ('cash', 'upi', 'bank', 'credit_card', 'cheque', 'other'));

alter table public.invoices add column if not exists amount_paid numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists delivery_address text;
alter table public.invoices add column if not exists vehicle_number text;
alter table public.invoices add column if not exists transport_name text;
alter table public.invoices add column if not exists tax_type text not null default 'exclusive';
alter table public.invoices drop constraint if exists invoices_tax_type_check;
alter table public.invoices add constraint invoices_tax_type_check
  check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst'));
alter table public.invoices add column if not exists place_of_supply_state text;
alter table public.invoices add column if not exists cgst_amount numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists sgst_amount numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists igst_amount numeric(12, 2) not null default 0;
alter table public.invoices add column if not exists round_off numeric(12, 2) not null default 0;

-- ---------- invoice_items ----------
alter table public.invoice_items add column if not exists discount_percent numeric(5, 2) not null default 0;

-- ---------- quotations ----------
alter table public.quotations add column if not exists delivery_address text;
alter table public.quotations add column if not exists vehicle_number text;
alter table public.quotations add column if not exists transport_name text;
alter table public.quotations add column if not exists tax_type text not null default 'exclusive';
alter table public.quotations drop constraint if exists quotations_tax_type_check;
alter table public.quotations add constraint quotations_tax_type_check
  check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst'));
alter table public.quotations add column if not exists place_of_supply_state text;
alter table public.quotations add column if not exists gst_enabled boolean not null default false;
alter table public.quotations add column if not exists gst_percent numeric(5, 2) not null default 0;
alter table public.quotations add column if not exists gst_amount numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists cgst_amount numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists sgst_amount numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists igst_amount numeric(12, 2) not null default 0;
alter table public.quotations add column if not exists round_off numeric(12, 2) not null default 0;

-- ---------- quotation_items ----------
alter table public.quotation_items add column if not exists discount_percent numeric(5, 2) not null default 0;

-- ---------- purchases ----------
alter table public.purchases drop constraint if exists purchases_status_check;
alter table public.purchases add constraint purchases_status_check
  check (status in ('unpaid', 'partial', 'paid', 'cancelled'));

alter table public.purchases drop constraint if exists purchases_payment_method_check;
alter table public.purchases add constraint purchases_payment_method_check
  check (payment_method in ('cash', 'upi', 'bank', 'credit_card', 'cheque', 'other'));

alter table public.purchases add column if not exists amount_paid numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists delivery_address text;
alter table public.purchases add column if not exists vehicle_number text;
alter table public.purchases add column if not exists transport_name text;
alter table public.purchases add column if not exists tax_type text not null default 'exclusive';
alter table public.purchases drop constraint if exists purchases_tax_type_check;
alter table public.purchases add constraint purchases_tax_type_check
  check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst'));
alter table public.purchases add column if not exists place_of_supply_state text;
alter table public.purchases add column if not exists cgst_amount numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists sgst_amount numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists igst_amount numeric(12, 2) not null default 0;
alter table public.purchases add column if not exists round_off numeric(12, 2) not null default 0;

-- ---------- purchase_items ----------
alter table public.purchase_items add column if not exists discount_percent numeric(5, 2) not null default 0;
