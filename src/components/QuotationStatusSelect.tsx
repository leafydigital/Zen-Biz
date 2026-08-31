"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { QuotationStatus } from "@/types/database";

const STYLES: Record<QuotationStatus, string> = {
  draft: "bg-paper-fold text-text-soft",
  sent: "bg-brass/15 text-brass-dark",
  accepted: "bg-success-bg text-success",
  rejected: "bg-alert-bg text-alert",
};

export function QuotationStatusSelect({
  quotationId,
  status,
}: {
  quotationId: string;
  status: QuotationStatus;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [current, setCurrent] = useState(status);
  const [updating, setUpdating] = useState(false);

  async function handleChange(next: QuotationStatus) {
    setUpdating(true);
    setCurrent(next);
   await supabase.from("quotations" as never).update({ status: next } as never).eq("id", quotationId);
    setUpdating(false);
    router.refresh();
  }

  return (
    <select
      value={current}
      disabled={updating}
      onChange={(e) => handleChange(e.target.value as QuotationStatus)}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-[0.7rem] font-semibold capitalize focus:ring-2 focus:ring-ink/40 ${STYLES[current]}`}
    >
      <option value="draft">Draft</option>
      <option value="sent">Sent</option>
      <option value="accepted">Accepted</option>
      <option value="rejected">Rejected</option>
    </select>
  );
}
