-- =============================================================================
-- ZEN BIZ — MIGRATION 6 (adds Item Code and HSN Code)
-- =============================================================================
-- Item Code is your own reference/SKU, free to use and shows on every
-- document. HSN Code is the GST classification code — it can be entered on
-- any product for free, but only prints on the invoice/quotation/purchase
-- PDF once the business is on the paid plan (checked in the app, not by
-- this column existing or not).
--
-- Safe to run even if these columns already exist.
-- =============================================================================

alter table public.products add column if not exists item_code text;
alter table public.products add column if not exists hsn_code text;

alter table public.invoice_items add column if not exists item_code text;
alter table public.invoice_items add column if not exists hsn_code text;

alter table public.quotation_items add column if not exists item_code text;
alter table public.quotation_items add column if not exists hsn_code text;

alter table public.purchase_items add column if not exists item_code text;
alter table public.purchase_items add column if not exists hsn_code text;
