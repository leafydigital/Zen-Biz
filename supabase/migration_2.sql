-- =============================================================================
-- ZEN BIZ — MIGRATION (run this ONLY if you already ran the old schema.sql)
-- =============================================================================
-- If you already created your Supabase project and ran the original
-- schema.sql before business type became free text (before logo/GST/address
-- were added), run this file once in the SQL Editor to update your existing
-- database WITHOUT losing any data you've already entered.
--
-- If this is a brand new Supabase project that has never run schema.sql,
-- skip this file — just run schema.sql instead, it already includes
-- everything below.
-- =============================================================================

-- Remove the old restriction that only allowed 'travel' / 'jewellery' /
-- 'general' as business types — it's free text now.
alter table public.profiles drop constraint if exists profiles_business_type_check;
alter table public.profiles alter column business_type set default '';

-- Add the new profile fields (safe to run even if they already exist).
alter table public.profiles add column if not exists logo_url text;
alter table public.profiles add column if not exists gst_number text;

-- Storage bucket + policies for business logos.
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view logos (public bucket)" on storage.objects;
create policy "Anyone can view logos (public bucket)"
  on storage.objects for select
  using (bucket_id = 'business-logos');

drop policy if exists "Owners can upload their own logo" on storage.objects;
create policy "Owners can upload their own logo"
  on storage.objects for insert
  with check (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can update their own logo" on storage.objects;
create policy "Owners can update their own logo"
  on storage.objects for update
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Owners can delete their own logo" on storage.objects;
create policy "Owners can delete their own logo"
  on storage.objects for delete
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] = auth.uid()::text);
