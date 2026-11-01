-- One-time email codes (support tickets and login). Server-only: RLS on, no policies.
create table if not exists public.email_otps (
  email text not null,
  purpose text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (email, purpose)
);
alter table public.email_otps enable row level security;
