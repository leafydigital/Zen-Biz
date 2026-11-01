import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewInvoiceForm } from "@/components/NewInvoiceForm";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { mergeBusinessIntoProfile } from "@/lib/getActiveBusiness";
import type { Business } from "@/types/database";
import type { Customer, Invoice, InvoiceItem, Product } from "@/types/database";

import { getAuthUser } from "@/lib/getAuthUser";
export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getAuthUser();

  const [invoiceResult, itemsResult, profile] = await Promise.all([
    supabase.from("invoices" as never).select("*").eq("id", params.id).maybeSingle(),
    supabase.from("invoice_items" as never).select("*").eq("invoice_id", params.id).order("created_at"),
    getCurrentProfile(),
  ]);

  const invoice = invoiceResult.data as Invoice | null;
  if (!invoice) notFound();

  // The row's own record_type is the source of truth for whether this is
  // an official invoice or a billing record — not a query param, which
  // could be wrong or missing if someone bookmarks/shares the link.
  const isBillingRecord = invoice.record_type === "billing_record";

  // Scoped to the invoice's OWN business — not necessarily whichever one
  // happens to be active right now, since this page can be reached via a
  // direct link regardless of the current switcher selection. RLS still
  // independently enforces that this only returns data if the signed-in
  // user is actually a member of that business.
  const [customersResult, productsResult] = await Promise.all([
    supabase.from("customers" as never).select("*").eq("business_id", invoice.business_id).order("name"),
    supabase.from("products").select("*").eq("business_id", invoice.business_id).eq("is_active", true).order("name"),
  ]);

  const { data: invoiceBusiness } = await supabase
    .from("businesses" as never)
    .select("*")
    .eq("id", invoice.business_id)
    .maybeSingle();

  const items = itemsResult.data as InvoiceItem[] | null;
  const customers = customersResult.data as Customer[] | null;
  const products = productsResult.data as Product[] | null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          {isBillingRecord ? "Edit billing record" : `Edit invoice #${invoice.invoice_number}`}
        </h1>
        <p className="text-sm text-text-soft">Update the details and save.</p>
      </div>
      <NewInvoiceForm
        ownerId={user!.id}
        businessId={invoice.business_id}
        profile={mergeBusinessIntoProfile(profile!, invoiceBusiness as Business | null)}
        customers={customers ?? []}
        products={products ?? []}
        suggestedInvoiceNumber={invoice.invoice_number}
        existingInvoice={invoice}
        existingItems={items ?? []}
        recordType={isBillingRecord ? "billing_record" : "invoice"}
      />
    </div>
  );
}
