import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewInvoiceForm } from "@/components/NewInvoiceForm";
import type { Customer, Invoice, InvoiceItem, Product, Profile } from "@/types/database";

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [invoiceResult, itemsResult, profileResult, customersResult, productsResult] =
    await Promise.all([
      supabase.from("invoices" as never).select("*").eq("id", params.id).maybeSingle(),
      supabase.from("invoice_items" as never).select("*").eq("invoice_id", params.id).order("created_at"),
      supabase.from("profiles" as never).select("*").eq("id", user!.id).single(),
      supabase.from("customers" as never).select("*").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
    ]);

  const invoice = invoiceResult.data as Invoice | null;
  if (!invoice) notFound();

  // The row's own record_type is the source of truth for whether this is
  // an official invoice or a billing record — not a query param, which
  // could be wrong or missing if someone bookmarks/shares the link.
  const isBillingRecord = invoice.record_type === "billing_record";

  const items = itemsResult.data as InvoiceItem[] | null;
  const profile = profileResult.data as Profile | null;
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
        profile={profile!}
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
