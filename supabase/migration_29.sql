-- migration_29.sql — Custom roles with tick/untick access
-- Run in Supabase SQL Editor (after migration_28). Safe to run twice.

create table if not exists public.business_roles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  permissions text[] not null default '{}',
  created_at timestamptz not null default now()
);

create unique index if not exists business_roles_name_idx
  on public.business_roles (business_id, lower(name));

alter table public.business_roles enable row level security;

-- Members can read their business's roles. All writes go through server
-- actions (service role) that verify the caller is the owner.
drop policy if exists "Members can view roles" on public.business_roles;
create policy "Members can view roles"
  on public.business_roles for select using (public.is_business_member(business_id));

alter table public.business_members
  add column if not exists role_id uuid references public.business_roles (id) on delete set null;

drop function if exists public.list_business_members(uuid);

create or replace function public.list_business_members(target_business_id uuid)
returns table (
  user_id uuid, email text, role text, created_at timestamptz,
  full_name text, username text, is_active boolean,
  role_id uuid, role_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select bm.user_id, u.email::text, bm.role, bm.created_at,
         bm.full_name, bm.username, bm.is_active,
         bm.role_id, br.name
  from public.business_members bm
  join auth.users u on u.id = bm.user_id
  left join public.business_roles br on br.id = bm.role_id
  where bm.business_id = target_business_id
    and public.is_business_member(target_business_id)
  order by bm.created_at asc;
$$;

grant execute on function public.list_business_members(uuid) to authenticated;
