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
      supabase.from("invoices").select("*").eq("id", params.id).maybeSingle(),
      supabase.from("invoice_items").select("*").eq("invoice_id", params.id).order("created_at"),
      supabase.from("profiles").select("*").eq("id", user!.id).single(),
      supabase.from("customers").select("*").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
    ]);

  const invoice = invoiceResult.data as Invoice | null;
  if (!invoice) notFound();

  const items = itemsResult.data as InvoiceItem[] | null;
  const profile = profileResult.data as Profile | null;
  const customers = customersResult.data as Customer[] | null;
  const products = productsResult.data as Product[] | null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          Edit invoice #{invoice.invoice_number}
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
      />
    </div>
  );
}
