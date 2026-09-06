-- =============================================================================
-- ZEN BIZ — MIGRATION 18 (Multi-business architecture, part 2: RLS)
-- =============================================================================
-- Run this only after migration_17.sql has been applied AND verified (every
-- existing row across every table has a non-null business_id — see the
-- verification query at the bottom of this file).
--
-- Replaces every `auth.uid() = owner_id` policy with a business-membership
-- check: a user can read/write a row if they're a member of the business
-- that row belongs to (business_members), not just if they created it.
-- This is what makes a second invited team member able to see the same
-- business's data, and is the actual security boundary between businesses
-- — two businesses can never share rows no matter who's logged in, since
-- the check is always scoped to one specific business_id.
--
-- business_id is set NOT NULL only now, after confirming every row has one
-- — doing that in the same migration as the backfill would risk a
-- half-populated NOT NULL column if anything failed partway through.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper: look up a user's id by email, for inviting an existing Zen Biz
-- user to a business by email address. auth.users isn't directly
-- queryable from the client (by design, for privacy), so this narrow
-- security definer function is the safe way to do that one lookup without
-- exposing the whole auth.users table. Returns only the id — never any
-- other account details — and only for actual existing accounts.
-- ---------------------------------------------------------------------------
create or replace function public.get_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;

grant execute on function public.get_user_id_by_email(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Helper: look up a user's email by their phone number, so the login form
-- can accept either an email or a phone number and resolve it to the
-- email Supabase Auth actually needs. Callable by anon (not just
-- authenticated) since this runs BEFORE the person is signed in — that's
-- the whole point of a login form. Still narrow: returns only an email
-- string for an exact phone match, nothing else about the account, and a
-- non-existent phone number returns null rather than any distinguishing
-- error (so this can't be used to enumerate which phone numbers have
-- accounts).
-- ---------------------------------------------------------------------------
create or replace function public.get_email_by_phone(lookup_phone text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where regexp_replace(p.phone, '[^0-9]', '', 'g') = regexp_replace(lookup_phone, '[^0-9]', '', 'g')
    and p.phone is not null
    and length(regexp_replace(lookup_phone, '[^0-9]', '', 'g')) > 0
  limit 1;
$$;

grant execute on function public.get_email_by_phone(text) to anon, authenticated;

create or replace function public.is_business_member(check_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.business_members
    where business_members.business_id = check_business_id
      and business_members.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Helper: list a business's members with their email addresses, for the
-- Team/Users management screen. Only returns rows for a business the
-- caller is themselves a member of — checked inside the function, not
-- left to the caller — and only exposes id/email/role/created_at, never
-- any other auth.users column.
-- ---------------------------------------------------------------------------
create or replace function public.list_business_members(target_business_id uuid)
returns table (user_id uuid, email text, role text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select bm.user_id, u.email, bm.role, bm.created_at
  from public.business_members bm
  join auth.users u on u.id = bm.user_id
  where bm.business_id = target_business_id
    and public.is_business_member(target_business_id)
  order by bm.created_at asc;
$$;

grant execute on function public.list_business_members(uuid) to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'customers', 'invoices', 'invoice_items', 'quotations',
    'quotation_items', 'suppliers', 'purchases', 'purchase_items',
    'delivery_challans', 'delivery_challan_items'
  ]
  loop
    execute format('alter table public.%I alter column business_id set not null', t);

    execute format('drop policy if exists "Owners can view their own %s" on public.%I', t, t);
    execute format('drop policy if exists "Owners can insert their own %s" on public.%I', t, t);
    execute format('drop policy if exists "Owners can update their own %s" on public.%I', t, t);
    execute format('drop policy if exists "Owners can delete their own %s" on public.%I', t, t);

    execute format(
      'create policy "Members can view %s" on public.%I for select using (public.is_business_member(business_id))',
      t, t
    );
    execute format(
      'create policy "Members can insert %s" on public.%I for insert with check (public.is_business_member(business_id))',
      t, t
    );
    execute format(
      'create policy "Members can update %s" on public.%I for update using (public.is_business_member(business_id))',
      t, t
    );
    execute format(
      'create policy "Members can delete %s" on public.%I for delete using (public.is_business_member(business_id))',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Verification query — run this yourself after applying both migrations.
-- Every row should return zero here; if any table shows a count > 0, do
-- not proceed until it's fixed.
-- ---------------------------------------------------------------------------
-- select 'products' as table_name, count(*) from public.products where business_id is null
-- union all select 'customers', count(*) from public.customers where business_id is null
-- union all select 'invoices', count(*) from public.invoices where business_id is null
-- union all select 'invoice_items', count(*) from public.invoice_items where business_id is null
-- union all select 'quotations', count(*) from public.quotations where business_id is null
-- union all select 'quotation_items', count(*) from public.quotation_items where business_id is null
-- union all select 'suppliers', count(*) from public.suppliers where business_id is null
-- union all select 'purchases', count(*) from public.purchases where business_id is null
-- union all select 'purchase_items', count(*) from public.purchase_items where business_id is null
-- union all select 'delivery_challans', count(*) from public.delivery_challans where business_id is null
-- union all select 'delivery_challan_items', count(*) from public.delivery_challan_items where business_id is null;
