-- Owner console (/app): app-wide settings and discount codes.

-- Public, non-secret settings (version, contact details, plan prices). Anyone can READ;
-- only server code with the service-role key can change them.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "Anyone can read app settings" on public.app_settings;
create policy "Anyone can read app settings"
  on public.app_settings for select to anon, authenticated using (true);

-- Discount codes: RLS on with NO policies, so only the server (service role) can touch them.
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('percent', 'flat')),
  value numeric not null check (value > 0),
  plans text[],                 -- null/empty = any plan
  max_uses integer,             -- null = unlimited
  used_count integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now()
);
alter table public.discount_codes enable row level security;
