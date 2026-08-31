"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    const { error } = await supabase.from("invoices").delete().eq("id", invoiceId);
    setDeleting(false);
    if (error) {
      console.error("Zen Biz: failed to delete invoice", error);
      setError(error.message || "Could not delete. Please try again.");
      return;
    }
    setConfirming(false);
    router.push("/dashboard/invoices");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert-bg"
      >
        Delete
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
      onClick={() => !deleting && setConfirming(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[340px] rounded-xl2 bg-paper-card p-5 shadow-card"
      >
        <p className="mb-1.5 text-sm font-semibold text-text">Delete this invoice?</p>
        <p className="mb-4 text-sm text-text-soft">
          This can't be undone. If any items on this invoice track stock,
          their quantities will be added back automatically.
        </p>
        {error && (
          <p className="mb-3 rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="flex-1 rounded-lg border border-paper-fold px-3 py-2 text-sm font-medium text-text transition hover:bg-paper disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-lg bg-alert px-3 py-2 text-sm font-semibold text-white transition hover:bg-alert/90 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
