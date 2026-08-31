"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSaleDocumentPdf } from "@/lib/generateSaleDocumentPdf";
import type { DocDesignSettings, DocFontSize, DocPaperSize, DocStyle, Profile } from "@/types/database";
import { DEFAULT_DOCUMENT_DESIGN } from "@/types/database";

const SAMPLE_ITEMS = [
  { description: "Sample product", quantity: 2, unit: "piece", item_code: "SKU-101", hsn_code: "7113", unit_price: 500, line_total: 1000 },
  { description: "Sample service", quantity: 1, unit: "service", item_code: null, hsn_code: null, unit_price: 750, line_total: 750 },
];

const PAPER_SIZE_OPTIONS: { value: DocPaperSize; label: string; hint: string }[] = [
  { value: "a4", label: "A4", hint: "Standard full page" },
  { value: "a5", label: "A5", hint: "Half page, compact" },
  { value: "thermal", label: "Thermal", hint: "80mm receipt printer" },
];

const STYLE_OPTIONS: { value: DocStyle; label: string; hint: string; locked?: boolean }[] = [
  { value: "default", label: "Default", hint: "Teal accent colour" },
  { value: "thermal_simple", label: "Simple", hint: "Black & white only" },
  { value: "colourful_paid", label: "Colourful", hint: "Business plan", locked: true },
];

const FONT_SIZE_OPTIONS: DocFontSize[] = [9, 10, 11, 12, 13, 14];

export function DocumentDesignForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createClient();

  const [design, setDesign] = useState<DocDesignSettings>(
    profile.document_design ?? DEFAULT_DOCUMENT_DESIGN
  );
  const [signaturePreview, setSignaturePreview] = useState<string | null>(profile.signature_url);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  async function handlePreview() {
    setPreviewing(true);
    try {
      await generateSaleDocumentPdf({
        docLabel: "INVOICE",
        docNumber: "SAMPLE-0001",
        docDate: new Date().toISOString().slice(0, 10),
        status: "unpaid",
        partyLabel: "Bill to",
        party: { name: "Sample Customer", phone: "+91 90000 00000", address: "123 Sample Street" },
        items: SAMPLE_ITEMS,
        subtotal: 1750,
        gstEnabled: false,
        gstPercent: 0,
        gstAmount: 0,
        total: 1750,
        notes: "This is a preview using sample data.",
        profile,
        filenamePrefix: "Preview",
        design,
        terms: profile.invoice_terms,
        signatureUrl: signaturePreview,
      });
    } finally {
      setPreviewing(false);
    }
  }

  function update(patch: Partial<DocDesignSettings>) {
    setSaved(false);
    setDesign((prev) => ({ ...prev, ...patch }));
  }

  function handleSignatureChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaved(false);
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
  }

  function removeSignature() {
    setSaved(false);
    setSignatureFile(null);
    setSignaturePreview(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    let signatureUrl = signaturePreview;
    if (signatureFile) {
      const ext = signatureFile.name.split(".").pop();
      const path = `${profile.id}/signature.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(path, signatureFile, { upsert: true });
      if (uploadErr) {
        setSaving(false);
        setError(`Couldn't upload signature (${uploadErr.message}).`);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("signatures")
        .getPublicUrl(path);
      signatureUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        document_design: design,
        signature_url: signatureUrl,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      console.error("Zen Biz: failed to save document design", error);
      setError(error.message || "Could not save. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">
          Document appearance
        </h2>
        <p className="text-sm text-text-soft">
          Applies to every Invoice, Quotation, and Purchase PDF.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text">Paper size</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {PAPER_SIZE_OPTIONS.map((opt) => {
            const active = design.paperSize === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ paperSize: opt.value })}
                className={`flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-paper-fold bg-white text-text hover:border-ink/40"
                }`}
              >
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className={`text-xs ${active ? "text-paper/70" : "text-text-soft"}`}>
                  {opt.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text">Design style</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {STYLE_OPTIONS.map((opt) => {
            const active = design.style === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.locked}
                onClick={() => !opt.locked && update({ style: opt.value })}
                className={`relative flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition ${
                  opt.locked
                    ? "cursor-not-allowed border-paper-fold bg-paper opacity-60"
                    : active
                      ? "border-ink bg-ink text-paper"
                      : "border-paper-fold bg-white text-text hover:border-ink/40"
                }`}
              >
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className={`text-xs ${active ? "text-paper/70" : "text-text-soft"}`}>
                  {opt.hint}
                </span>
                {opt.locked && (
                  <span className="absolute right-2 top-2 rounded-full bg-brass/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brass-dark">
                    Business
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text">Font size</p>
        <select
          value={design.fontSize}
          onChange={(e) => update({ fontSize: Number(e.target.value) as DocFontSize })}
          className="w-full max-w-[160px] rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        >
          {FONT_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}pt
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">
          Signature / Seal <span className="text-text-soft">(optional)</span>
        </span>
        <div className="flex items-center gap-4">
          {signaturePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signaturePreview}
              alt="Signature preview"
              className="h-16 w-32 rounded-lg border border-paper-fold bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-16 w-32 items-center justify-center rounded-lg border border-dashed border-paper-fold text-xs text-text-soft">
              No image
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <input
              type="file"
              accept="image/*"
              onChange={handleSignatureChange}
              className="text-sm text-text-soft"
            />
            {signaturePreview && (
              <button
                type="button"
                onClick={removeSignature}
                className="self-start text-xs font-medium text-alert"
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <span className="text-xs text-text-soft">
          Shown above "Authorized Signatory" on every document PDF.
        </span>
      </div>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success" role="status">
          Saved.
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewing}
          className="flex-1 rounded-xl border border-paper-fold px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-paper disabled:opacity-60"
        >
          {previewing ? "Preparing…" : "Download preview PDF"}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
