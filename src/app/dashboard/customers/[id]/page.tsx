import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustomerDetailView } from "@/components/CustomerDetailView";
import type { Customer } from "@/types/database";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: customer } = (await supabase
    .from("customers" as never)
    .select("*")
    .eq("id", params.id)
    .maybeSingle()) as { data: Customer | null };

  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-text-soft hover:text-ink"
      >
        ← Back to Customers
      </Link>
      <CustomerDetailView customer={customer} />
    </div>
  );
}
