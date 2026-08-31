-- =============================================================================
-- ZEN BIZ — MIGRATION 4 (adds invoice/quotation design settings)
-- =============================================================================
-- Adds two JSON columns to profiles: invoice_design and quotation_design.
-- Each stores { paperSize, style, fontSize } so invoices and quotations can
-- have completely independent paper size, design style, and font size.
--
-- Safe to run even if these columns already exist.
-- =============================================================================

alter table public.profiles
  add column if not exists invoice_design jsonb not null default
    '{"paperSize": "a4", "style": "default", "fontSize": 10}'::jsonb;

alter table public.profiles
  add column if not exists quotation_design jsonb not null default
    '{"paperSize": "a4", "style": "default", "fontSize": 10}'::jsonb;
