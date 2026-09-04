import { createClient } from "@/lib/supabase/server";
import { NewInvoiceForm } from "@/components/NewInvoiceForm";
import type { Customer, Product, Profile } from "@/types/database";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const isBillingRecord = searchParams.type === "billing";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Start of the current calendar month, in the server's local time — the
  // 50-invoice Starter limit resets on the 1st, not on a rolling 30-day
  // window. Only official invoices count toward it, so this count
  // deliberately excludes billing_record rows.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [profileResult, customersResult, productsResult, { count }, { count: monthCount }] =
    await Promise.all([
      supabase.from("profiles" as never).select("*").eq("id", user!.id).single(),
      supabase.from("customers" as never).select("*").order("name"),
      supabase.from("products").select("*").eq("is_active", true).order("name"),
      supabase
        .from("invoices" as never)
        .select("id", { count: "exact", head: true })
        .eq("record_type", "invoice"),
      supabase
        .from("invoices" as never)
        .select("id", { count: "exact", head: true })
        .eq("record_type", "invoice")
        .gte("created_at", monthStart.toISOString()),
    ]);

  const profile = profileResult.data as Profile | null;
  const customers = customersResult.data as Customer[] | null;
  const products = productsResult.data as Product[] | null;
  const plan = profile?.plan ?? "starter";

  const suggestedInvoiceNumber = `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;

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
        profile={profile!}
        customers={customers ?? []}
        products={products ?? []}
        suggestedInvoiceNumber={suggestedInvoiceNumber}
        invoicesThisMonth={monthCount ?? 0}
        recordType={isBillingRecord ? "billing_record" : "invoice"}
      />
    </div>
  );
}
