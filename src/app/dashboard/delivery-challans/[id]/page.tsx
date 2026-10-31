import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentDetailView } from "@/components/DocumentDetailView";
import { ChallanStatusSelect } from "@/components/ChallanStatusSelect";
import { DownloadChallanButton } from "@/components/DownloadChallanButton";
import { DeleteRecordButton } from "@/components/DeleteRecordButton";

export default async function ViewChallanPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: c } = (await supabase.from("delivery_challans" as never).select("*").eq("id", params.id).maybeSingle()) as { data: any };
  if (!c) notFound();
  const { data: items } = (await supabase
    .from("delivery_challan_items" as never)
    .select("*")
    .eq("challan_id", c.id)
    .order("created_at", { ascending: true })) as { data: any[] | null };
  let customer: any = null;
  if (c.customer_id) {
    const { data } = await supabase.from("customers" as never).select("*").eq("id", c.customer_id).maybeSingle();
    customer = data;
  }
  return (
    <DocumentDetailView
      backHref="/dashboard/delivery-challans"
      backLabel="Back to Delivery Challans"
      title={`Delivery Challan #${c.challan_number}`}
      subtitle={c.challan_date}
      actions={
        <>
          <ChallanStatusSelect challanId={c.id} status={c.status} />
          <DownloadChallanButton challanId={c.id} />
          <DeleteRecordButton table="delivery_challans" id={c.id} label="delivery challan" redirectTo="/dashboard/delivery-challans" />
        </>
      }
      partyLabel="Customer"
      party={customer}
      items={items ?? []}
      notes={c.notes}
    />
  );
}
