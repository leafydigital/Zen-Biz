-- =============================================================================
-- ZEN BIZ — MIGRATION 23 (Repair: re-run business_id backfill safely)
-- =============================================================================
-- If any existing invoices, customers, products, etc. are missing a
-- business_id (e.g. because the original migration_17.sql backfill ran
-- before this account's business/business_members rows were in their
-- final, correct state — plausible given the RLS recursion bug fixed in
-- migration_22.sql could have interfered with earlier steps), this
-- re-links every such row to its owner's business.
--
-- This does NOT touch any row that already has a business_id — only
-- rows where it's still null get filled in. Safe to re-run as many
-- times as needed; it only ever fixes gaps, never overwrites existing
-- correct links.
-- =============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'customers', 'invoices', 'invoice_items', 'quotations',
    'quotation_items', 'suppliers', 'purchases', 'purchase_items',
    'delivery_challans', 'delivery_challan_items'
  ]
  loop
    execute format(
      'update public.%I t set business_id = b.id
       from public.businesses b
       where t.business_id is null and b.owner_id = t.owner_id',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Verification — run this yourself after applying the update above.
-- Every count should be 0. If any table still shows a number > 0, that
-- means some rows have an owner_id that doesn't match any business's
-- owner_id at all (e.g. the business itself is missing) — a different,
-- rarer problem that would need to be looked at individually.
-- ---------------------------------------------------------------------------
-- select 'invoices' as table_name, count(*) from public.invoices where business_id is null
-- union all select 'customers', count(*) from public.customers where business_id is null
-- union all select 'products', count(*) from public.products where business_id is null
-- union all select 'purchases', count(*) from public.purchases where business_id is null
-- union all select 'quotations', count(*) from public.quotations where business_id is null
-- union all select 'suppliers', count(*) from public.suppliers where business_id is null
-- union all select 'delivery_challans', count(*) from public.delivery_challans where business_id is null;
