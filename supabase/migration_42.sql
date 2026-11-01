-- Owner-console users with roles and per-section access (View / Edit).
-- Server-only: RLS is on with no policies, so only the service-role key can read it.
create table if not exists public.console_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role_name text not null default 'Staff',
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  is_super boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.console_users enable row level security;
