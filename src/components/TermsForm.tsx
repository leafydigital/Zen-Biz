"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

const TERMS_FIELD: Record<"invoice" | "quotation" | "purchase", "invoice_terms" | "quotation_terms" | "purchase_terms"> = {
  invoice: "invoice_terms",
  quotation: "quotation_terms",
  purchase: "purchase_terms",
};

export function TermsForm({
  profile,
  docType,
  title,
  placeholder,
}: {
  profile: Profile;
  docType: "invoice" | "quotation" | "purchase";
  title: string;
  placeholder: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const field = TERMS_FIELD[docType];

  const [terms, setTerms] = useState(profile[field] ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: terms.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
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
