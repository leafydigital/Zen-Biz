-- =============================================================================
-- ZEN BIZ — MIGRATION 14 (Billing Record feature)
-- =============================================================================
-- Adds two columns to the existing invoices table so a row can represent
-- either an official, numbered Invoice or an internal-only Billing Record
-- — the same shape of data (customer, items, GST, totals, payment info)
-- either way, just gated differently in the UI:
--
-- - record_type: 'invoice' (default, matches every existing row) or
--   'billing_record'. Billing records don't count toward the monthly
--   invoice limit and have no download/print/share affordances.
-- - converted_invoice_id: set on a billing_record once it has been
--   turned into a real invoice, so it can't be converted twice and the
--   UI can link straight to the resulting invoice.
--
-- Safe to run even if these columns already exist.
-- =============================================================================

alter table public.invoices add column if not exists record_type text not null default 'invoice';
alter table public.invoices drop constraint if exists invoices_record_type_check;
alter table public.invoices add constraint invoices_record_type_check
  check (record_type in ('invoice', 'billing_record'));

alter table public.invoices add column if not exists converted_invoice_id uuid references public.invoices (id) on delete set null;
