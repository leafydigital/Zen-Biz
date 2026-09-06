-- =============================================================================
-- ZEN BIZ — MIGRATION 20 (Repair: missing business_members rows)
-- =============================================================================
-- Root cause of the /dashboard <-> /onboarding redirect issue: an account
-- can have profiles.onboarding_complete = true (and even a real row in
-- businesses, owned by that account) while having NO row in
-- business_members. The dashboard layout requires an active business —
-- resolved via business_members, not just businesses.owner_id — so an
-- account in this state gets sent to /onboarding, which (correctly,
-- after the previous fix) no longer trusts onboarding_complete alone and
-- shows the setup form again instead of looping.
--
-- This happens when migration_17.sql — which originally backfilled one
-- businesses row AND one business_members row per existing profile —
-- was never actually run against this database, so any business created
-- before that point exists in `businesses` but was never linked via
-- `business_members`.
--
-- This migration does NOT create or delete any business or profile data.
-- It only adds the missing membership link for businesses that already
-- exist and already have a real owner, so those owners are correctly
-- recognized as members of the business they already created.
--
-- Safe to re-run — only inserts rows that don't already exist.
-- =============================================================================

insert into public.business_members (business_id, user_id, role)
select b.id, b.owner_id, 'owner'
from public.businesses b
where not exists (
  select 1 from public.business_members bm
  where bm.business_id = b.id and bm.user_id = b.owner_id
);

-- ---------------------------------------------------------------------------
-- Verification — run this yourself after applying the insert above.
-- Replace <your-user-id> with your actual auth.users id (find it under
-- Authentication -> Users in the Supabase dashboard, or by running
-- `select id from auth.users where email = 'you@example.com';`).
-- This should return at least one row once the fix has been applied.
-- ---------------------------------------------------------------------------
-- select * from public.business_members where user_id = '<your-user-id>';
