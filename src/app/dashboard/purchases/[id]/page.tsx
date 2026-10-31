import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentDetailView } from "@/components/DocumentDetailView";
import { PurchaseStatusSelect } from "@/components/PurchaseStatusSelect";
import { DownloadPurchaseButton } from "@/components/DownloadPurchaseButton";
import { DocShareActions } from "@/components/DocShareActions";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";

export default async function ViewPurchasePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: p } = (await supabase.from("purchases" as never).select("*").eq("id", params.id).maybeSingle()) as { data: any };
  if (!p) notFound();
  const { data: items } = (await supabase
    .from("purchase_items" as never)
    .select("*")
    .eq("purchase_id", p.id)
    .order("created_at", { ascending: true })) as { data: any[] | null };
  let supplier: any = null;
  if (p.supplier_id) {
    const { data } = await supabase.from("suppliers" as never).select("*").eq("id", p.supplier_id).maybeSingle();
    supplier = data;
  }
  const extra: { label: string; value: string }[] = [];
  if (p.vehicle_number) extra.push({ label: "Vehicle", value: p.vehicle_number });
  if (p.transport_name) extra.push({ label: "Transport", value: p.transport_name });
  return (
    <DocumentDetailView
      backHref="/dashboard/purchases"
      backLabel="Back to Purchases"
      title={`Purchase #${p.purchase_number}`}
      subtitle={p.purchase_date}
      actions={
        <>
          <PurchaseStatusSelect purchaseId={p.id} status={p.status} paymentMethod={p.payment_method} />
          <DownloadPurchaseButton purchaseId={p.id} />
          <DocShareActions kind="purchase" id={p.id} />
          <DeleteRecordButton table="purchases" id={p.id} label="purchase" redirectTo="/dashboard/purchases" />
        </>
      }
      partyLabel="Supplier"
      party={supplier}
      extra={extra}
      summary={{
        subtotal: Number(p.subtotal),
        rows: [
          { label: `GST (${p.gst_percent}%)`, value: p.gst_enabled ? Number(p.gst_amount) : 0 },
          { label: "Round off", value: Number(p.round_off ?? 0) },
        ],
        total: Number(p.total),
      }}
      items={items ?? []}
      currency={p.currency}
      notes={p.notes}
    />
  );
}
