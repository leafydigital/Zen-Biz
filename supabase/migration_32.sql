-- migration_32.sql — Separate numbering per business
--
-- Invoice / quotation / purchase / challan numbers were unique per OWNER,
-- so a second business could not start again at INV-0001. They are now
-- unique per BUSINESS. Safe to run twice.

do $$
declare
  spec record;
  con record;
begin
  for spec in
    select * from (values
      ('invoices', 'invoice_number'),
      ('quotations', 'quotation_number'),
      ('purchases', 'purchase_number'),
      ('delivery_challans', 'challan_number')
    ) as t(tbl, numcol)
  loop
    -- drop the old (owner_id, number) unique constraint, whatever it is named
    for con in
      select c.conname
      from pg_constraint c
      where c.conrelid = format('public.%I', spec.tbl)::regclass
        and c.contype = 'u'
        and (
          select array_agg(a.attname::text order by a.attname::text)
          from pg_attribute a
          where a.attrelid = c.conrelid and a.attnum = any (c.conkey)
        ) = array['owner_id', spec.numcol]::text[]
    loop
      execute format('alter table public.%I drop constraint %I', spec.tbl, con.conname);
    end loop;

    execute format(
      'create unique index if not exists %I on public.%I (business_id, %I)',
      spec.tbl || '_business_number_idx', spec.tbl, spec.numcol
    );
  end loop;
end $$;
