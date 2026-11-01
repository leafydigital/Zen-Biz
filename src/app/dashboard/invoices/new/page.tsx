import { createClient } from "@/lib/supabase/server";
import { getNextDocumentNumber } from "@/lib/getNextDocumentNumber";
import { NewInvoiceForm } from "@/components/NewInvoiceForm";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness, mergeBusinessIntoProfile } from "@/lib/getActiveBusiness";
import type { Customer, Product } from "@/types/database";

import { getAuthUser } from "@/lib/getAuthUser";
export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const isBillingRecord = searchParams.type === "billing";
  const supabase = createClient();
  const user = await getAuthUser();

  const activeBusiness = await getActiveBusiness();
  const businessId = activeBusiness?.id ?? "";

  // Start of the current calendar month, in the server's local time — the
  // 50-invoice Starter limit resets on the 1st, not on a rolling 30-day
  // window. Only official invoices count toward it, so this count
  // deliberately excludes billing_record rows.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [profile, customersResult, productsResult, { count }, { count: monthCount }] =
    await Promise.all([
      getCurrentProfile(),
      supabase.from("customers" as never).select("*").eq("business_id", businessId).order("name"),
      supabase.from("products").select("*").eq("business_id", businessId).eq("is_active", true).order("name"),
      supabase
        .from("invoices" as never)
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("record_type", "invoice"),
      supabase
        .from("invoices" as never)
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("record_type", "invoice")
        .gte("created_at", monthStart.toISOString()),
    ]);

  const customers = customersResult.data as Customer[] | null;
  const products = productsResult.data as Product[] | null;
  const plan = profile?.plan ?? "starter";

  const suggestedInvoiceNumber = await getNextDocumentNumber(supabase as never, "invoice", businessId, activeBusiness?.format_settings);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">
          {isBillingRecord ? "New billing record" : "New invoice"}
        </h1>
        <p className="text-sm text-text-soft">
          {isBillingRecord
            ? "Save this for your own records — no invoice number, no limit used."
            : "Fill in the details and save."}
        </p>
      </div>
      <NewInvoiceForm
        ownerId={user!.id}
        businessId={businessId}
        profile={mergeBusinessIntoProfile(profile!, activeBusiness)}
        customers={customers ?? []}
        products={products ?? []}
        suggestedInvoiceNumber={suggestedInvoiceNumber}
        invoicesThisMonth={monthCount ?? 0}
        recordType={isBillingRecord ? "billing_record" : "invoice"}
      />
    </div>
  );
}
