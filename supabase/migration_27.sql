-- =============================================================================
-- ZEN BIZ — MIGRATION 27 (Contact Us / Raise a Ticket)
-- =============================================================================
-- Adds a support_tickets table for the Settings -> Contact Us form, and a
-- private storage bucket for optional screenshot attachments on "Issue"
-- tickets. Unlike business-logos (a public bucket, since logos appear on
-- shareable PDFs), ticket screenshots are private support data — only the
-- submitter can see their own uploaded files, matching the RLS on the
-- ticket row itself.
--
-- Safe to re-run.
-- =============================================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete set null,
  -- 'info' = "I want to know more details" (a question/inquiry).
  -- 'issue' = "I'm facing an issue" (a problem report, may include a
  -- screenshot).
  ticket_type text not null check (ticket_type in ('info', 'issue')),
  name text not null,
  whatsapp_number text,
  email text not null,
  address text,
  pincode text,
  notes text,
  message text not null,
  screenshot_url text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

drop policy if exists "Users can view their own tickets" on public.support_tickets;
create policy "Users can view their own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own tickets" on public.support_tickets;
create policy "Users can create their own tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- Tickets are never edited or deleted by the submitter once sent — only
-- viewed. Status changes (open -> resolved, etc.) are an admin/support
-- operation, done directly in Supabase, not through the app's own RLS.

-- ---------------------------------------------------------------------------
-- Storage bucket + policies for ticket screenshots (private, not public).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ticket-screenshots', 'ticket-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "Users can view their own ticket screenshots" on storage.objects;
create policy "Users can view their own ticket screenshots"
  on storage.objects for select
  using (bucket_id = 'ticket-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can upload their own ticket screenshots" on storage.objects;
create policy "Users can upload their own ticket screenshots"
  on storage.objects for insert
  with check (bucket_id = 'ticket-screenshots' and (storage.foldername(name))[1] = auth.uid()::text);
