-- =============================================================================
-- ZEN BIZ — MIGRATION 10 (shared document design, bank details, QR, currency)
-- =============================================================================
-- Consolidates invoice_design/quotation_design/purchase_design into one
-- shared document_design, and the three signature URLs into one
-- signature_url — paper size, style, font size, and signature/seal are now
-- one setting used across Invoice, Quotation, and Purchase. Terms &
-- Conditions stay separate per document type (invoice_terms,
-- quotation_terms, purchase_terms are unchanged).
--
-- Also adds: bank details, a payment QR code, a default_currency
-- suggestion, and a real `currency` column on invoices/quotations/purchases
-- (chosen per document, not fixed business-wide). Removes the old
-- terms_signature_edit_count limit entirely, since edits are now unlimited
-- on every plan.
--
-- Existing per-document design/signature values are migrated onto the new
-- shared columns using whichever one was saved most recently (falls back
-- to invoice's values, then quotation's, then purchase's) — no data is
-- silently discarded, but note that if you had genuinely different paper
-- sizes/signatures set per document type before, only one survives after
-- this migration, matching the new shared-setting design.
--
-- Safe to run even if some of this already exists.
-- =============================================================================

alter table public.profiles add column if not exists document_design jsonb
  not null default '{"paperSize": "a4", "style": "default", "fontSize": 10}'::jsonb;
alter table public.profiles add column if not exists signature_url text;

alter table public.profiles add column if not exists bank_name text;
alter table public.profiles add column if not exists bank_account_name text;
alter table public.profiles add column if not exists bank_account_number text;
alter table public.profiles add column if not exists bank_ifsc_or_swift text;
alter table public.profiles add column if not exists payment_qr_url text;
alter table public.profiles add column if not exists default_currency text not null default 'INR';

-- Carry over existing per-document values onto the new shared columns,
-- preferring invoice's, then quotation's, then purchase's. Each source
-- column is checked independently before being referenced — on some
-- databases only some of these ever got added (e.g. purchase_design was
-- never present), so referencing a column that doesn't exist would error
-- out rather than just skipping it.
do $$
declare
  has_invoice_design boolean;
  has_quotation_design boolean;
  has_purchase_design boolean;
  has_invoice_sig boolean;
  has_quotation_sig boolean;
  has_purchase_sig boolean;
  design_expr text := 'document_design';
  sig_expr text := 'signature_url';
begin
  select exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'invoice_design')
    into has_invoice_design;
  select exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'quotation_design')
    into has_quotation_design;
  select exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'purchase_design')
    into has_purchase_design;
  select exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'invoice_signature_url')
    into has_invoice_sig;
  select exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'quotation_signature_url')
    into has_quotation_sig;
  select exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'purchase_signature_url')
    into has_purchase_sig;

  if has_invoice_design or has_quotation_design or has_purchase_design then
    design_expr := 'coalesce(' ||
      (case when has_invoice_design then 'invoice_design, ' else '' end) ||
      (case when has_quotation_design then 'quotation_design, ' else '' end) ||
      (case when has_purchase_design then 'purchase_design, ' else '' end) ||
      'document_design)';
  end if;

  if has_invoice_sig or has_quotation_sig or has_purchase_sig then
    sig_expr := 'coalesce(' ||
      (case when has_invoice_sig then 'invoice_signature_url, ' else '' end) ||
      (case when has_quotation_sig then 'quotation_signature_url, ' else '' end) ||
      (case when has_purchase_sig then 'purchase_signature_url, ' else '' end) ||
      'signature_url)';
  end if;

  if has_invoice_design or has_quotation_design or has_purchase_design
     or has_invoice_sig or has_quotation_sig or has_purchase_sig then
    execute format(
      'update public.profiles set document_design = %s, signature_url = %s',
      design_expr, sig_expr
    );
  end if;
end $$;

alter table public.profiles drop column if exists invoice_design;
alter table public.profiles drop column if exists quotation_design;
alter table public.profiles drop column if exists purchase_design;
alter table public.profiles drop column if exists invoice_signature_url;
alter table public.profiles drop column if exists quotation_signature_url;
alter table public.profiles drop column if exists purchase_signature_url;
alter table public.profiles drop column if exists terms_signature_edit_count;

alter table public.invoices add column if not exists currency text not null default 'INR';
alter table public.quotations add column if not exists currency text not null default 'INR';
alter table public.purchases add column if not exists currency text not null default 'INR';

-- Storage bucket for payment QR codes.
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
