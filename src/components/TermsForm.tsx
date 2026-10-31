"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Business } from "@/types/database";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";

const TERMS_FIELD: Record<"invoice" | "quotation" | "purchase", "invoice_terms" | "quotation_terms" | "purchase_terms"> = {
  invoice: "invoice_terms",
  quotation: "quotation_terms",
  purchase: "purchase_terms",
};

export function TermsForm({
  business,
  docType,
  title,
  placeholder,
}: {
  business: Business;
  docType: "invoice" | "quotation" | "purchase";
  title: string;
  placeholder: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const field = TERMS_FIELD[docType];

  const [terms, setTerms] = useState(business[field] ?? "");
  const [saving, setSaving] = useState(false);
  const { showLoader, hideLoader } = useGlobalLoader();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    showLoader("Saving terms…");
    const { error } = await supabase
      .from("businesses" as never)
     .update({ [field]: terms.trim() || null } as never)
      .eq("id", business.id);
    setSaving(false);
    hideLoader();
    if (error) {
      console.error(`Zen Biz: failed to save ${field}`, error);
      setError(error.message || "Could not save. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-paper-fold bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-text">{title}</p>
        <p className="text-xs text-text-soft">
          Printed at the bottom of every {docType} PDF.
        </p>
      </div>
      <textarea
        value={terms}
        onChange={(e) => {
          setSaved(false);
          setTerms(e.target.value);
        }}
        rows={3}
        placeholder={placeholder}
        className="rounded-xl border border-paper-fold bg-paper px-3.5 py-2.5 text-[0.9rem] text-text placeholder:text-text-soft/60 focus:border-ink"
      />
      {error && (
        <p className="rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg bg-success-bg px-3 py-2 text-xs text-success" role="status">
          Saved.
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-lg bg-ink px-4 py-2 text-xs font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
