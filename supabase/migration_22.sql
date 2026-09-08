-- =============================================================================
-- ZEN BIZ — MIGRATION 22 (Fix: infinite recursion between businesses and
-- business_members RLS policies)
-- =============================================================================
-- The actual, definitive root cause of the /dashboard <-> /onboarding
-- issue, found by adding error surfacing to the app and reading the real
-- Postgres error directly:
--
--   "infinite recursion detected in policy for relation business_members"
--   "infinite recursion detected in policy for relation businesses"
--
-- The businesses SELECT policy (migration_21.sql) queries
-- business_members to check membership. The business_members SELECT
-- policy (migration_17.sql, "Members can view their own memberships")
-- queries businesses right back, to check ownership. Postgres evaluates
-- one, which triggers evaluating the other, which triggers the first
-- again, forever — the query never returns rows, it ERRORS. Application
-- code that only checked for empty data (not the error itself) saw that
-- error and treated it exactly like "this user has no business", sending
-- a real owner with a real business back to onboarding indefinitely.
--
-- The fix: business_members' policy no longer queries businesses
-- directly. It uses a new security definer helper function instead —
-- such functions run with elevated privilege and bypass RLS internally,
-- so calling it from business_members' policy does NOT re-trigger
-- businesses' own RLS policy, breaking the cycle. businesses' policy
-- (already using is_business_member(), itself security definer, since
-- migration_18.sql) is untouched — only the business_members side had a
-- direct, non-function table reference left over from migration_17.sql,
-- and that's the one that needed to change.
--
-- This does not weaken security: the underlying rule is identical
-- (a business's owner, or an existing member, can see that business's
-- membership rows) — only how it's evaluated changes, to avoid the loop.
--
-- Safe to re-run.
-- =============================================================================

create or replace function public.is_business_owner(check_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.businesses
    where businesses.id = check_business_id
      and businesses.owner_id = auth.uid()
  );
$$;

drop policy if exists "Members can view their own memberships" on public.business_members;
create policy "Members can view their own memberships"
  on public.business_members for select using (
    user_id = auth.uid()
    or public.is_business_owner(business_id)
  );

drop policy if exists "Business owners can add members" on public.business_members;
create policy "Business owners can add members"
  on public.business_members for insert with check (
    public.is_business_owner(business_id)
  );

drop policy if exists "Business owners can remove members" on public.business_members;
create policy "Business owners can remove members"
  on public.business_members for delete using (
    public.is_business_owner(business_id)
  );
