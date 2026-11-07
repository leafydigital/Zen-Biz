-- migration_51.sql — Proforma invoices
-- Proforma invoices are stored in the quotations tables (same columns, same
-- access rules, same team permissions). doc_kind tells them apart.
-- Run this once in the Supabase SQL editor.
alter table public.quotations add column if not exists doc_kind text not null default 'quotation';
alter table public.quotations drop constraint if exists quotations_doc_kind_check;
alter table public.quotations add constraint quotations_doc_kind_check check (doc_kind in ('quotation', 'proforma'));
create index if not exists quotations_business_kind_idx on public.quotations (business_id, doc_kind);
