-- Contact Us: separate phone number (the WhatsApp number may be the same or different).
alter table public.support_tickets add column if not exists phone text;
