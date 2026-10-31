-- migration_33.sql — Customer ID (auto or custom)
-- Run in Supabase SQL Editor. Safe to run twice.

alter table public.customers add column if not exists customer_code text;

-- Number existing customers per business (oldest first): CUST-0001, CUST-0002 …
with numbered as (
  select id,
         row_number() over (partition by business_id order by created_at, id) as n
  from public.customers
  where customer_code is null or customer_code = ''
)
update public.customers c
set customer_code = 'CUST-' || lpad(numbered.n::text, 4, '0')
from numbered
where numbered.id = c.id
  and not exists (
    select 1 from public.customers x
    where x.business_id = c.business_id
      and x.customer_code = 'CUST-' || lpad(numbered.n::text, 4, '0')
  );

-- New customers with no ID typed in get the next CUST-xxxx for their business.
create or replace function public.set_customer_code()
returns trigger
language plpgsql
as $$
declare
  next_n int;
begin
  if new.customer_code is null or btrim(new.customer_code) = '' then
    perform pg_advisory_xact_lock(hashtext(new.business_id::text));
    select coalesce(max((substring(customer_code from '^CUST-(\d+)$'))::int), 0) + 1
      into next_n
      from public.customers
      where business_id = new.business_id;
    new.customer_code := 'CUST-' || lpad(next_n::text, 4, '0');
  else
    new.customer_code := btrim(new.customer_code);
  end if;
  return new;
end;
$$;

drop trigger if exists customers_set_code on public.customers;
create trigger customers_set_code
  before insert on public.customers
  for each row execute function public.set_customer_code();

-- One customer ID per business, case-insensitive.
create unique index if not exists customers_business_code_idx
  on public.customers (business_id, lower(customer_code));
