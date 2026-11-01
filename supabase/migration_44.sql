-- migration_44.sql — Activity log (who changed what, and when)
-- Run in Supabase SQL Editor. Safe to run twice.
--
-- Every add / edit / delete on the main business tables is written to
-- activity_logs by a database trigger, so it is captured no matter which
-- screen (website or Android app) made the change. The table has RLS on and
-- no policies: only the server (service role) reads or deletes entries, and
-- it checks that the caller is the owner or has been given the Activity log
-- permission in Team.

alter table public.businesses
  add column if not exists log_retention_days integer
  check (log_retention_days is null or log_retention_days > 0);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  user_id uuid,
  user_name text not null default 'System',
  action text not null,            -- created | updated | deleted
  entity text not null,            -- e.g. Product, Customer, Billing record
  entity_name text,
  details text,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_business_created_idx
  on public.activity_logs (business_id, created_at desc);

alter table public.activity_logs enable row level security;

create or replace function public.log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb;
  oj jsonb;
  bid uuid;
  uid uuid := auth.uid();
  uname text;
  ent text;
  ename text;
  act text;
  det text;
  keep integer;
begin
  begin
    if tg_op = 'DELETE' then
      j := to_jsonb(old);
    else
      j := to_jsonb(new);
    end if;
    if tg_op = 'UPDATE' then
      oj := to_jsonb(old);
    end if;

    if tg_table_name = 'businesses' then
      bid := (j ->> 'id')::uuid;
    else
      bid := nullif(j ->> 'business_id', '')::uuid;
    end if;
    if bid is null then
      return coalesce(new, old);
    end if;

    -- Who did it: team member name / username, else the account's own name or email.
    select coalesce(nullif(bm.full_name, ''), nullif(bm.username, ''))
      into uname
      from public.business_members bm
     where bm.business_id = bid and bm.user_id = uid
     limit 1;
    if uname is null and uid is not null then
      select coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), u.email)
        into uname
        from auth.users u where u.id = uid;
    end if;
    if uid is not null and exists (
      select 1 from public.businesses b where b.id = bid and b.owner_id = uid
    ) then
      uname := coalesce(uname, 'Owner') || ' (Owner)';
    end if;
    uname := coalesce(uname, 'System');

    ent := case tg_table_name
      when 'products' then 'Product'
      when 'customers' then 'Customer'
      when 'suppliers' then 'Supplier'
      when 'invoices' then case when j ->> 'record_type' = 'billing_record' then 'Billing record' else 'Invoice' end
      when 'quotations' then 'Quotation'
      when 'purchases' then 'Purchase'
      when 'delivery_challans' then 'Delivery challan'
      when 'businesses' then 'Business settings'
      when 'business_members' then 'Team member'
      when 'business_roles' then 'Role'
      else tg_table_name
    end;

    ename := coalesce(
      nullif(j ->> 'name', ''),
      nullif(j ->> 'business_name', ''),
      nullif(j ->> 'full_name', ''),
      nullif(j ->> 'username', ''),
      case when tg_table_name = 'invoices' and j ->> 'record_type' = 'billing_record'
           then 'Bill ' || upper(left(j ->> 'id', 6)) end,
      nullif(j ->> 'invoice_number', ''),
      nullif(j ->> 'quotation_number', ''),
      nullif(j ->> 'purchase_number', ''),
      nullif(j ->> 'challan_number', '')
    );
    if j ? 'total' and j ->> 'total' is not null then
      ename := coalesce(ename, '') || ' (total ' || (j ->> 'total') || ')';
    end if;

    act := case tg_op when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;

    if tg_op = 'UPDATE' then
      select string_agg(
               n.key || ': ' || left(coalesce(o.value #>> '{}', '—'), 40) || ' → ' || left(coalesce(n.value #>> '{}', '—'), 40),
               '; ' order by n.key)
        into det
        from jsonb_each(j) n
        join jsonb_each(oj) o on o.key = n.key
       where n.value is distinct from o.value
         and n.key not in ('updated_at', 'created_at')
         and n.key !~* '(password|token|secret)';
      if det is null then
        return new;                       -- nothing meaningful changed
      end if;
      det := left(det, 600);
    elsif tg_op = 'INSERT' then
      det := 'Added ' || lower(ent) || coalesce(' "' || ename || '"', '');
    else
      det := 'Deleted ' || lower(ent) || coalesce(' "' || ename || '"', '');
    end if;

    insert into public.activity_logs (business_id, user_id, user_name, action, entity, entity_name, details)
    values (bid, uid, uname, act, ent, ename, det);

    -- Auto-delete entries older than the owner's retention setting.
    select log_retention_days into keep from public.businesses where id = bid;
    if keep is not null then
      delete from public.activity_logs
       where business_id = bid and created_at < now() - make_interval(days => keep);
    end if;
  exception when others then
    null;                                  -- logging must never block the real change
  end;
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'customers', 'suppliers', 'invoices', 'quotations',
    'purchases', 'delivery_challans', 'businesses', 'business_members', 'business_roles'
  ] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_log_activity on public.%I', t);
      execute format(
        'create trigger trg_log_activity after insert or update or delete on public.%I
         for each row execute function public.log_activity()', t);
    end if;
  end loop;
end $$;
