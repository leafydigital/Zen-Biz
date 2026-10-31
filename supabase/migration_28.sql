-- migration_28.sql — Team users with name, username, password and roles
--
-- Run in Supabase SQL Editor. Safe to run twice.
--
-- Roles: owner (one per business, can do everything),
--        admin (can add/edit/remove manager + staff),
--        manager, staff ('member' is the old name for staff and still works).

alter table public.business_members
  drop constraint if exists business_members_role_check;

alter table public.business_members
  add constraint business_members_role_check
  check (role in ('owner', 'admin', 'manager', 'staff', 'member'));

alter table public.business_members add column if not exists full_name text;
alter table public.business_members add column if not exists username text;
alter table public.business_members add column if not exists is_active boolean not null default true;

-- list_business_members now also returns name / username / active flag.
drop function if exists public.list_business_members(uuid);

create or replace function public.list_business_members(target_business_id uuid)
returns table (
  user_id uuid, email text, role text, created_at timestamptz,
  full_name text, username text, is_active boolean
)
language sql
security definer
set search_path = public
stable
as $$
  select bm.user_id, u.email::text, bm.role, bm.created_at,
         bm.full_name, bm.username, bm.is_active
  from public.business_members bm
  join auth.users u on u.id = bm.user_id
  where bm.business_id = target_business_id
    and public.is_business_member(target_business_id)
  order by bm.created_at asc;
$$;

grant execute on function public.list_business_members(uuid) to authenticated;
