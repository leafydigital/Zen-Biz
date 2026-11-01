-- Ticket reference number (ZB-1001, ZB-1002, ...) shown to the customer and in the owner console.
create sequence if not exists public.support_ticket_no_seq start 1001;

alter table public.support_tickets add column if not exists ticket_no bigint;

-- Number the tickets that already exist, oldest first.
update public.support_tickets t
set ticket_no = n.rn
from (
  select id, nextval('public.support_ticket_no_seq') as rn
  from public.support_tickets
  where ticket_no is null
  order by created_at
) n
where t.id = n.id;

alter table public.support_tickets alter column ticket_no set default nextval('public.support_ticket_no_seq');
create unique index if not exists support_tickets_ticket_no_key on public.support_tickets (ticket_no);
