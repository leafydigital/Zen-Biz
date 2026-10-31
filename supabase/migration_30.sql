-- migration_30.sql — Roles shared across all of an owner's businesses,
-- multi-business access per user, and settings edit rights.
-- Run in Supabase SQL Editor (after migration_29). Safe to run twice.

-- 1. Roles belong to the owner (usable in every one of their businesses)
alter table public.business_roles add column if not exists owner_id uuid references auth.users (id) on delete cascade;
update public.business_roles r set owner_id = b.owner_id
  from public.businesses b where b.id = r.business_id and r.owner_id is null;
alter table public.business_roles alter column owner_id set not null;

drop index if exists public.business_roles_name_idx;
create unique index if not exists business_roles_owner_name_idx
  on public.business_roles (owner_id, lower(name));

create or replace function public.has_role_assigned(check_role_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.business_members
    where role_id = check_role_id and user_id = auth.uid()
  );
$$;

drop policy if exists "Members can view roles" on public.business_roles;
create policy "Members can view roles"
  on public.business_roles for select
  using (owner_id = auth.uid() or public.has_role_assigned(id));

-- 2. Members list also returns every business of this owner the user can open
drop function if exists public.list_business_members(uuid);

create or replace function public.list_business_members(target_business_id uuid)
returns table (
  user_id uuid, email text, role text, created_at timestamptz,
  full_name text, username text, is_active boolean,
  role_id uuid, role_name text, business_ids uuid[]
)
language sql
security definer
set search_path = public
stable
as $$
  select bm.user_id, u.email::text, bm.role, bm.created_at,
         bm.full_name, bm.username, bm.is_active,
         bm.role_id, br.name,
         coalesce((
           select array_agg(bm2.business_id)
           from public.business_members bm2
           join public.businesses b2 on b2.id = bm2.business_id
           where bm2.user_id = bm.user_id
             and b2.owner_id = (select owner_id from public.businesses where id = target_business_id)
         ), '{}')
  from public.business_members bm
  join auth.users u on u.id = bm.user_id
  left join public.business_roles br on br.id = bm.role_id
  where bm.business_id = target_business_id
    and public.is_business_member(target_business_id)
  order by bm.created_at asc;
$$;

grant execute on function public.list_business_members(uuid) to authenticated;

-- 3. Who may save business settings: the owner, admins, and members whose
--    role ticks an "Edit" box under settings.
create or replace function public.can_edit_business_settings(check_business_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.businesses where id = check_business_id and owner_id = auth.uid())
  or exists (
    select 1
    from public.business_members bm
    left join public.business_roles br on br.id = bm.role_id
    where bm.business_id = check_business_id
      and bm.user_id = auth.uid()
      and bm.is_active
      and (
        bm.role = 'admin'
        or coalesce(br.permissions, '{}') && array[
          'settings','settings.general:edit','settings.appearance:edit',
          'settings.terms:edit','settings.bank:edit'
        ]
      )
  );
$$;

drop policy if exists "Owners can update their own businesses" on public.businesses;
drop policy if exists "Settings editors can update businesses" on public.businesses;
create policy "Settings editors can update businesses"
  on public.businesses for update
  using (public.can_edit_business_settings(id))
  with check (public.can_edit_business_settings(id));
