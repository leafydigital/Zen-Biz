-- migration_34.sql — Formats: number formats, invoice titles
-- Run in Supabase SQL Editor (after migration_33). Safe to run twice.

alter table public.businesses add column if not exists format_settings jsonb;
alter table public.invoices add column if not exists doc_title text;

-- Customer IDs follow the business's own format (Settings → Formats).
create or replace function public.set_customer_code()
returns trigger
language plpgsql
as $$
declare
  fs jsonb;
  pfx text;
  digs int;
  start_n int;
  pfx_re text;
  next_n int;
begin
  if new.customer_code is not null and btrim(new.customer_code) <> '' then
    new.customer_code := btrim(new.customer_code);
    return new;
  end if;

  select format_settings -> 'numbering' -> 'customer' into fs
    from public.businesses where id = new.business_id;

  pfx := coalesce(fs ->> 'prefix', 'CUST-');
  pfx := replace(replace(replace(pfx, '{YYYY}', to_char(now(), 'YYYY')), '{YY}', to_char(now(), 'YY')), '{MM}', to_char(now(), 'MM'));
  digs := greatest(1, least(10, coalesce(nullif(fs ->> 'digits', '')::int, 4)));
  start_n := greatest(0, coalesce(nullif(fs ->> 'start', '')::int, 1));
  pfx_re := regexp_replace(pfx, '([^A-Za-z0-9])', '\\\1', 'g');

  perform pg_advisory_xact_lock(hashtext(new.business_id::text));
  select coalesce(max((substring(customer_code from '^' || pfx_re || '(\d+)$'))::int), start_n - 1) + 1
    into next_n
    from public.customers
    where business_id = new.business_id;

  new.customer_code := pfx || lpad(next_n::text, digs, '0');
  return new;
end;
$$;

-- Saving the Formats tab needs the same rights as the other settings tabs.
create or replace function public.can_edit_business_settings(check_business_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from public.businesses where id = check_business_id and owner_id = auth.uid())
  or exists (
    select 1
    from public.business_members bm
    left join public.business_roles br on br.id = bm.role_id
    where bm.business_id = check_business_id
      and bm.user_id = auth.uid()
      and bm.is_active
      and (
        bm.role = 'admin'
        or coalesce(br.permissions, '{}') && array[
          'settings','settings.general:edit','settings.appearance:edit',
          'settings.terms:edit','settings.bank:edit','settings.format:edit'
        ]
      )
  );
$$;
