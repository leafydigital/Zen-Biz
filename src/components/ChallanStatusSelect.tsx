"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { DeliveryChallanStatus } from "@/types/database";

const STYLES: Record<DeliveryChallanStatus, string> = {
  draft: "bg-paper-fold text-text-soft",
  dispatched: "bg-brass/15 text-brass-dark",
  delivered: "bg-success-bg text-success",
};

export function ChallanStatusSelect({
  challanId,
  status,
}: {
  challanId: string;
  status: DeliveryChallanStatus;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [current, setCurrent] = useState(status);
  const [updating, setUpdating] = useState(false);

  async function handleChange(next: DeliveryChallanStatus) {
    setUpdating(true);
    setCurrent(next);
              await supabase.from("delivery_challans" as never).update({ status: next } as never).eq("id", challanId);
    setUpdating(false);
    router.refresh();
  }

  return (
    <select
      value={current}
      disabled={updating}
      onChange={(e) => handleChange(e.target.value as DeliveryChallanStatus)}
      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-[0.7rem] font-semibold capitalize focus:ring-2 focus:ring-ink/40 ${STYLES[current]}`}
    >
      <option value="draft">Draft</option>
      <option value="dispatched">Dispatched</option>
      <option value="delivered">Delivered</option>
    </select>
  );
}
