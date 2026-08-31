-- =============================================================================
-- ZEN BIZ — MIGRATION 7 (adds Terms & Conditions and Signature/Seal)
-- =============================================================================
-- Adds separate Terms & Conditions text and a Signature/Seal image per
-- document type (Invoice, Quotation, Purchase) — all free features. Also
-- adds purchase_design (paper size/style/font), which previously reused
-- invoice_design, so Purchases can now have fully independent settings too.
--
-- Safe to run even if these columns already exist.
-- =============================================================================

alter table public.profiles add column if not exists purchase_design jsonb not null default
  '{"paperSize": "a4", "style": "default", "fontSize": 10}'::jsonb;

alter table public.profiles add column if not exists invoice_terms text;
alter table public.profiles add column if not exists quotation_terms text;
alter table public.profiles add column if not exists purchase_terms text;

alter table public.profiles add column if not exists invoice_signature_url text;
alter table public.profiles add column if not exists quotation_signature_url text;
alter table public.profiles add column if not exists purchase_signature_url text;

-- Storage bucket for signature/seal images — mirrors the business-logos
-- bucket already set up in migration_2.sql.
insert into storage.buckets (id, name, public)
values ('signatures', 'signatures', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view signatures (public bucket)" on storage.objects;
create policy "Anyone can view signatures (public bucket)"
  on storage.objects for select
  using (bucket_id = 'signatures');

drop policy if exists "Owners can upload their own signature" on storage.objects;
create policy "Owners can upload their own signature"
  on storage.objects for insert
  with check (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can update their own signature" on storage.objects;
create policy "Owners can update their own signature"
  on storage.objects for update
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can delete their own signature" on storage.objects;
create policy "Owners can delete their own signature"
  on storage.objects for delete
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);
