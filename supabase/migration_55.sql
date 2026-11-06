-- migration_55.sql — automatic bill numbers for Billing (POS): B0001, B0002 ...
-- Run in Supabase SQL Editor. Safe to run twice.

alter table public.invoices add column if not exists bill_no integer;
alter table public.businesses add column if not exists billing_counter integer not null default 0;

-- Numbers existing billing records in the order they were made.
with n as (
  select id, row_number() over (partition by business_id order by created_at, id) as rn
  from public.invoices
  where record_type = 'billing_record' and bill_no is null
)
update public.invoices i set bill_no = n.rn from n where i.id = n.id;

update public.businesses b
set billing_counter = coalesce(
  (select max(bill_no) from public.invoices i where i.business_id = b.id and i.record_type = 'billing_record'), 0);

-- Gives every new billing record the next number. Runs as the database owner so team members can use it too.
create or replace function public.assign_bill_no() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.record_type = 'billing_record' and new.bill_no is null then
    update public.businesses
       set billing_counter = billing_counter + 1
     where id = new.business_id
    returning billing_counter into new.bill_no;
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_assign_bill_no on public.invoices;
create trigger invoices_assign_bill_no
  before insert on public.invoices
  for each row execute function public.assign_bill_no();

create unique index if not exists invoices_billing_bill_no_idx
  on public.invoices (business_id, bill_no)
  where record_type = 'billing_record';
