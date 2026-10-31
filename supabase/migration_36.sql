-- Each business connects its own Gmail (address + App Password) to email invoices.
-- The password is stored encrypted and is only ever read by server code using the
-- service-role key: RLS is on with NO policies, so browsers can never read this table.
create table if not exists public.business_email_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  smtp_email text not null,
  smtp_password_enc text not null,
  updated_at timestamptz not null default now()
);
alter table public.business_email_settings enable row level security;
