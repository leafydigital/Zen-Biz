-- =============================================================================
-- ZEN BIZ — MIGRATION 25 (Fix: storage policies for business-keyed buckets)
-- =============================================================================
-- "Couldn't upload logo (new row violates row-level security policy)" —
-- root cause: the business-logos, signatures, and payment-qr storage
-- policies (from migrations 2, 7, and 10) require the uploaded file's
-- folder name to equal auth.uid() (the signed-in user's own id). But the
-- app actually uploads these to a path keyed by business.id (see
-- SettingsForm.tsx, DocumentDesignForm.tsx, BankDetailsForm.tsx) — a
-- business's own id, not the user's. For a user's very first business
-- this could happen to still work by coincidence in some setups, but
-- for a second or third business, business.id is a genuinely different
-- uuid than the user's own id, so the old policy correctly (by its own
-- outdated rule) rejects every upload.
--
-- Fix: these three buckets' policies now check business membership via
-- is_business_member() (security definer, already used everywhere else
-- in the app for this same purpose) instead of a literal id match. Only
-- someone who's actually a member of the business named by the file's
-- folder can upload/update/delete its logo, signature, or payment QR —
-- this is still real ownership-based access control, just checked
-- correctly against businesses instead of the wrong id.
--
-- product-images is untouched — that bucket is still keyed by owner_id,
-- not business.id, matching how ProductFormModal.tsx actually uploads
-- to it, so its existing policy is already correct for the path it's
-- checking.
--
-- Safe to re-run.
-- =============================================================================

drop policy if exists "Owners can upload their own logo" on storage.objects;
create policy "Business members can upload their business's logo"
  on storage.objects for insert
  with check (
    bucket_id = 'business-logos'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can update their own logo" on storage.objects;
create policy "Business members can update their business's logo"
  on storage.objects for update
  using (
    bucket_id = 'business-logos'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can delete their own logo" on storage.objects;
create policy "Business members can delete their business's logo"
  on storage.objects for delete
  using (
    bucket_id = 'business-logos'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can upload their own signature" on storage.objects;
create policy "Business members can upload their business's signature"
  on storage.objects for insert
  with check (
    bucket_id = 'signatures'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can update their own signature" on storage.objects;
create policy "Business members can update their business's signature"
  on storage.objects for update
  using (
    bucket_id = 'signatures'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can delete their own signature" on storage.objects;
create policy "Business members can delete their business's signature"
  on storage.objects for delete
  using (
    bucket_id = 'signatures'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can upload their own payment QR" on storage.objects;
create policy "Business members can upload their business's payment QR"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-qr'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can update their own payment QR" on storage.objects;
create policy "Business members can update their business's payment QR"
  on storage.objects for update
  using (
    bucket_id = 'payment-qr'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Owners can delete their own payment QR" on storage.objects;
create policy "Business members can delete their business's payment QR"
  on storage.objects for delete
  using (
    bucket_id = 'payment-qr'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );
