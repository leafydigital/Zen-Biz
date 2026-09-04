-- =============================================================================
-- ZEN BIZ — MIGRATION 15 (Tax Type modes: GST / Non-GST / Tax / Non-Tax)
-- =============================================================================
-- Widens the tax_type check constraint on invoices, quotations, and
-- purchases to accept three new values alongside the existing ones:
--   'gst'      — GST mode (CGST/SGST/IGST split, same math as before)
--   'tax'      — a flat, non-GST tax percentage (reuses the gst_percent /
--                gst_amount columns as a plain tax percentage / amount —
--                cgst/sgst/igst stay at 0 in this mode)
--   'non_tax'  — no tax at all
--
-- The old values ('inclusive', 'exclusive', 'exempt', 'non_gst') are kept
-- in the constraint so existing rows remain valid without needing a data
-- migration — the app now only writes the new values going forward, but
-- old documents keep displaying and printing correctly.
--
-- Safe to run even if already applied.
-- =============================================================================

alter table public.invoices drop constraint if exists invoices_tax_type_check;
alter table public.invoices add constraint invoices_tax_type_check
  check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst', 'gst', 'tax', 'non_tax'));

alter table public.quotations drop constraint if exists quotations_tax_type_check;
alter table public.quotations add constraint quotations_tax_type_check
  check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst', 'gst', 'tax', 'non_tax'));

alter table public.purchases drop constraint if exists purchases_tax_type_check;
alter table public.purchases add constraint purchases_tax_type_check
  check (tax_type in ('inclusive', 'exclusive', 'exempt', 'non_gst', 'gst', 'tax', 'non_tax'));
