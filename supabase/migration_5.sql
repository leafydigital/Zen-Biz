-- =============================================================================
-- ZEN BIZ — MIGRATION 5 (adds payment method to invoices and purchases)
-- =============================================================================
-- Adds a payment_method column (cash / bank / cheque) to both invoices and
-- purchases, so marking something "Paid" can also record how it was paid.
-- Safe to run even if the column already exists.
-- =============================================================================

alter table public.invoices
  add column if not exists payment_method text
  check (payment_method in ('cash', 'bank', 'cheque'));

alter table public.purchases
  add column if not exists payment_method text
  check (payment_method in ('cash', 'bank', 'cheque'));

-- Line items now remember their own unit (piece, kg, gram, etc.) at the time
-- of sale/purchase, rather than only inheriting whatever the linked product
-- is currently set to — so old invoices stay accurate even if a product's
-- unit changes later, and custom (non-product) line items can have a unit
-- too.
alter table public.invoice_items add column if not exists unit text not null default 'item';
alter table public.quotation_items add column if not exists unit text not null default 'item';
alter table public.purchase_items add column if not exists unit text not null default 'item';
