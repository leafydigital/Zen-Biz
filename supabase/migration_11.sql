-- =============================================================================
-- ZEN BIZ — MIGRATION 11 (Due Date, Ship To, per-line Tax %)
-- =============================================================================
-- Adds:
-- - due_date on invoices (already present on some installs) and
--   quotations (a "valid until" date)
-- - ship_to_name / ship_to_address on invoices and quotations — optional,
--   separate from the customer's own billing address
-- - tax_percent / tax_amount on every line item (invoice_items,
--   quotation_items, purchase_items) — a per-line tax rate shown as its
--   own column on the PDF, independent of the invoice-level GST toggle
--
-- Safe to run even if some of these columns already exist.
-- =============================================================================

alter table public.invoices add column if not exists due_date date;
alter table public.invoices add column if not exists ship_to_name text;
alter table public.invoices add column if not exists ship_to_address text;

alter table public.quotations add column if not exists valid_until date;
alter table public.quotations add column if not exists ship_to_name text;
alter table public.quotations add column if not exists ship_to_address text;

alter table public.invoice_items add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table public.invoice_items add column if not exists tax_amount numeric(12, 2) not null default 0;

alter table public.quotation_items add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table public.quotation_items add column if not exists tax_amount numeric(12, 2) not null default 0;

alter table public.purchase_items add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table public.purchase_items add column if not exists tax_amount numeric(12, 2) not null default 0;
