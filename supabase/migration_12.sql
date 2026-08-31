-- =============================================================================
-- ZEN BIZ — MIGRATION 12 (Product tax %, product image, storage bucket)
-- =============================================================================
-- Adds:
-- - tax_percent on products — a default tax rate saved per product (like
--   price), auto-filling onto invoice/quotation/purchase lines when that
--   product is selected. Independent from the per-line tax override.
-- - image_url on products — an optional product photo.
-- - a new "product-images" storage bucket (same per-owner privacy rule as
--   business-logos, signatures, and payment-qr).
--
-- Safe to run even if some of this already exists.
-- =============================================================================

alter table public.products add column if not exists tax_percent numeric(5, 2) not null default 0;
alter table public.products add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view product images (public bucket)" on storage.objects;
create policy "Anyone can view product images (public bucket)"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Owners can upload their own product images" on storage.objects;
create policy "Owners can upload their own product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can update their own product images" on storage.objects;
create policy "Owners can update their own product images"
  on storage.objects for update
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can delete their own product images" on storage.objects;
create policy "Owners can delete their own product images"
  on storage.objects for delete
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
