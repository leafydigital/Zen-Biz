"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getPlanFeatures } from "@/lib/planFeatures";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import type { Plan } from "@/types/database";

/**
 * Turns a Billing Record into an official Invoice: checks the monthly
 * limit first (Billing Records never count toward it, but the resulting
 * Invoice does), then assigns a real invoice number and flips
 * record_type. The Billing Record row itself becomes the Invoice row —
 * nothing is duplicated — with converted_invoice_id set to its own id so
 * the UI can tell "this is now an invoice" apart from "this was deleted".
 */
export function ConvertToInvoiceButton({
  recordId,
  ownerId,
  plan,
  invoicesThisMonth,
}: {
  recordId: string;
  ownerId: string;
  plan: Plan;
  invoicesThisMonth: number;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const limit = getPlanFeatures(plan).limits.invoicesPerMonth;

  async function handleConvert() {
    setError(null);

    // Check the limit right before converting, as close to the actual
    // write as possible — a page loaded a while ago could have a stale
    // count if other invoices were created in the meantime.
    if (limit !== null) {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("invoices" as never)
        .select("id", { count: "exact", head: true })
        .eq("record_type", "invoice")
        .gte("created_at", monthStart.toISOString());
      if ((count ?? 0) >= limit) {
        setShowLimitModal(true);
        return;
      }
    }

    setConverting(true);

    // Next sequential invoice number, same scheme as new-invoice creation
    // (INV-0001, INV-0002, ...), counting official invoices only.
    const { count: invoiceCount } = await supabase
      .from("invoices" as never)
      .select("id", { count: "exact", head: true })
      .eq("record_type", "invoice");
    const nextNumber = `INV-${String((invoiceCount ?? 0) + 1).padStart(4, "0")}`;

    const { error: updateErr } = await supabase
      .from("invoices" as never)
      .update({
        record_type: "invoice",
        invoice_number: nextNumber,
        converted_invoice_id: recordId,
      } as never)
      .eq("id", recordId)
      .eq("owner_id", ownerId)
      .eq("record_type", "billing_record"); // guards against converting twice

    setConverting(false);

    if (updateErr) {
      setError(updateErr.message || "Could not create the invoice. Please try again.");
      return;
    }

    router.push(`/dashboard/invoices/${recordId}`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleConvert}
        disabled={converting}
        className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {converting ? "Creating…" : "Create Invoice"}
      </button>
      {error && <p className="mt-2 text-xs text-alert">{error}</p>}

      {showLimitModal && limit !== null && (
        <LimitReachedModal
          kind="invoicesPerMonth"
          limit={limit}
          currentPlan={plan}
          onClose={() => setShowLimitModal(false)}
        />
      )}
    </>
  );
}
