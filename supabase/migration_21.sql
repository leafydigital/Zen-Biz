-- =============================================================================
-- ZEN BIZ — MIGRATION 21 (Fix: businesses SELECT policy excluded owners)
-- =============================================================================
-- The real, deepest root cause of the /dashboard <-> /onboarding issue:
-- the businesses table's SELECT policy (from migration_17.sql) only
-- allowed reading a business through a business_members row —
--
--   using (exists (select 1 from business_members where ... user_id = auth.uid()))
--
-- — with no fallback for the owner themselves. INSERT/UPDATE/DELETE on
-- businesses all correctly check `auth.uid() = owner_id` directly, but
-- SELECT never did. That means any account whose business_members row
-- is missing (see migration_20.sql) can't even be found by a repair
-- query looking it up via owner_id — RLS silently returns zero rows,
-- because the real owner isn't allowed to read their own business
-- without a membership row that itself can only be created by first
-- reading the business. This migration breaks that cycle by adding
-- owner_id as an explicit OR condition on SELECT, matching the same
-- rule the other three operations already use.
--
-- This does not weaken security: it only ever grants a business's own
-- owner (auth.uid() = businesses.owner_id) read access to that one row —
-- the same access every other operation on this table already grants
-- them. It does not change access for anyone else, and RLS on every
-- other table (products, customers, invoices, etc.) is untouched.
--
-- Safe to re-run.
-- =============================================================================

drop policy if exists "Members can view businesses they belong to" on public.businesses;
create policy "Members and owners can view their businesses"
  on public.businesses for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.business_members
      where business_members.business_id = businesses.id
        and business_members.user_id = auth.uid()
    )
  );
