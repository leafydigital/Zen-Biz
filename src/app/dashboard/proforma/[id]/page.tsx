import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentDetailView } from "@/components/DocumentDetailView";
import { QuotationStatusSelect } from "@/components/QuotationStatusSelect";
import { DownloadQuotationButton } from "@/components/DownloadQuotationButton";
import { DocShareActions } from "@/components/DocShareActions";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";

export default async function ViewProformaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: q } = (await supabase.from("quotations" as never).select("*").eq("id", params.id).maybeSingle()) as { data: any };
  if (!q) notFound();
  const { data: items } = (await supabase
    .from("quotation_items" as never)
    .select("*")
    .eq("quotation_id", q.id)
    .order("created_at", { ascending: true })) as { data: any[] | null };
  let customer: any = null;
  if (q.customer_id) {
    const { data } = await supabase.from("customers" as never).select("*").eq("id", q.customer_id).maybeSingle();
    customer = data;
  }
  return (
    <DocumentDetailView
      backHref="/dashboard/proforma"
      backLabel="Back to Proforma invoices"
      title={`Proforma Invoice #${q.quotation_number}`}
      subtitle={`${q.quotation_date}${q.valid_until ? ` · Valid until ${q.valid_until}` : ""}`}
      actions={
        <>
          <QuotationStatusSelect quotationId={q.id} status={q.status} />
          <DownloadQuotationButton quotationId={q.id} />
          <DocShareActions kind="quotation" id={q.id} />
          <DeleteRecordButton table="quotations" id={q.id} label="proforma invoice" redirectTo="/dashboard/proforma" />
        </>
      }
      partyLabel="Customer"
      party={customer}
      extra={q.delivery_address ? [{ label: "Delivery address", value: q.delivery_address }] : undefined}
      summary={{
        subtotal: Number(q.subtotal),
        rows: [
          { label: `GST (${q.gst_percent}%)`, value: q.gst_enabled ? Number(q.gst_amount) : 0 },
          { label: "Round off", value: Number(q.round_off ?? 0) },
        ],
        total: Number(q.total),
      }}
      items={items ?? []}
      currency={q.currency}
      notes={q.notes}
    />
  );
}
