"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PaymentMethod, PurchaseStatus } from "@/types/database";

const STYLES: Record<PurchaseStatus, string> = {
  paid: "bg-success-bg text-success",
  partial: "bg-brass/20 text-brass-dark",
  unpaid: "bg-brass/15 text-brass-dark",
  cancelled: "bg-paper-fold text-text-soft",
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank transfer" },
  { value: "credit_card", label: "Credit card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

export function PurchaseStatusSelect({
  purchaseId,
  status,
  paymentMethod,
}: {
  purchaseId: string;
  status: PurchaseStatus;
  paymentMethod?: PaymentMethod | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [current, setCurrent] = useState(status);
  const [updating, setUpdating] = useState(false);
  const [askingPaymentMethod, setAskingPaymentMethod] = useState(false);

  async function applyStatus(next: PurchaseStatus, method: PaymentMethod | null) {
    setUpdating(true);
    setCurrent(next);
    await supabase
      .from("purchases" as never)
     .update({ status: next, payment_method: method } as never)
      .eq("id", purchaseId);
    setUpdating(false);
    router.refresh();
  }

  async function handleChange(next: PurchaseStatus) {
    if (next === "paid") {
      setAskingPaymentMethod(true);
      return;
    }
    await applyStatus(next, null);
  }

  return (
    <div className="relative inline-block">
      <select
        value={current}
        disabled={updating}
        onChange={(e) => handleChange(e.target.value as PurchaseStatus)}
        className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-[0.7rem] font-semibold capitalize focus:ring-2 focus:ring-ink/40 ${STYLES[current]}`}
      >
        <option value="unpaid">Unpaid</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
        <option value="cancelled">Cancelled</option>
      </select>

      {askingPaymentMethod && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
          onClick={() => setAskingPaymentMethod(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[300px] rounded-xl2 bg-paper-card p-5 shadow-card"
          >
            <p className="mb-3 text-sm font-semibold text-text">Paid by?</p>
            <div className="flex flex-col gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => {
                    setAskingPaymentMethod(false);
                    applyStatus("paid", m.value);
                  }}
                  className="rounded-lg border border-paper-fold px-3.5 py-2.5 text-left text-sm font-medium text-text transition hover:border-ink/40 hover:bg-paper"
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAskingPaymentMethod(false)}
              className="mt-3 w-full rounded-lg px-3.5 py-2 text-center text-sm font-medium text-text-soft transition hover:bg-paper"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {current === "paid" && paymentMethod && !askingPaymentMethod && (
        <span className="ml-1.5 text-[0.65rem] capitalize text-text-soft">
          via {PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label ?? paymentMethod}
        </span>
      )}
    </div>
  );
}
