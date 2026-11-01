-- Follow-up reminders for plan renewals, set from the /app owner console.
-- Server-only: RLS on, no policies (only the service-role key can use it).
create table if not exists public.renewal_followups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  remind_on date,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.renewal_followups enable row level security;
