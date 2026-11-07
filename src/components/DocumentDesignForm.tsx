"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LiveInvoicePreview } from "@/components/LiveInvoicePreview";
import { ACCENT_PRESETS, DEFAULT_ACCENT, customOptions, normalizeStyle } from "@/lib/docDesign";
import { DOC_TEMPLATES, THERMAL_TEMPLATES } from "@/lib/docTemplates";
import { getPlanFeatures } from "@/lib/planFeatures";
import type { Business, DocCustomOptions, DocSizes, DocDesignSettings, DocFontFamily, DocFontSize, DocPaperSize, DocStyle, Plan } from "@/types/database";
import { DEFAULT_DOCUMENT_DESIGN } from "@/types/database";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";

const PAPER_SIZE_OPTIONS: { value: DocPaperSize; label: string; hint: string }[] = [
  { value: "a4", label: "A4", hint: "Standard full page" },
  { value: "a5", label: "A5", hint: "Half page, compact" },
  { value: "thermal", label: "Thermal 80mm", hint: "Standard receipt printer" },
  { value: "thermal58", label: "Thermal 58mm", hint: "Compact receipt printer" },
];

const STYLE_OPTIONS: { value: DocStyle; label: string; hint: string; paid?: boolean }[] = [
  { value: "simple", label: "Simple", hint: "Clean black & white" },
  { value: "colourful", label: "Colourful", hint: "Professional, your colour", paid: true },
  { value: "template", label: "Templates", hint: "10 ready designs", paid: true },
  { value: "custom", label: "Custom", hint: "Pick colour, font & sections", paid: true },
];

const FONT_FAMILIES: { value: DocFontFamily; label: string }[] = [
  { value: "helvetica", label: "Modern (Helvetica)" },
  { value: "times", label: "Classic (Times)" },
  { value: "courier", label: "Typewriter (Courier)" },
];

const SECTION_TOGGLES: { key: keyof DocCustomOptions; label: string }[] = [
  { key: "showLogo", label: "Logo" },
  { key: "showHsn", label: "HSN / SAC column" },
  { key: "showBank", label: "Bank details" },
  { key: "showQr", label: "Payment QR" },
  { key: "showSignature", label: "Signature / seal" },
  { key: "showNotes", label: "Notes" },
  { key: "showTerms", label: "Terms & conditions" },
  { key: "tintTable", label: "Coloured table headers" },
];

const SIZE_CONTROLS: {
  key: keyof DocSizes;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  auto: (base: number) => number;
}[] = [
  { key: "headerName", label: "Business name (header)", unit: "pt", min: 12, max: 32, step: 1, auto: (b) => b + 7 },
  { key: "headerDetails", label: "Address & contact (header)", unit: "pt", min: 7, max: 14, step: 0.5, auto: (b) => Math.max(b - 1, 7) },
  { key: "logoPercent", label: "Logo size", unit: "%", min: 50, max: 160, step: 5, auto: () => 100 },
  { key: "tableText", label: "Item table text", unit: "pt", min: 7, max: 14, step: 0.5, auto: (b) => Math.max(b - 1, 7) },
  { key: "totalAmount", label: "Total amount", unit: "pt", min: 10, max: 24, step: 1, auto: (b) => b + 3 },
];

const FONT_SIZE_OPTIONS: DocFontSize[] = [9, 10, 11, 12, 13, 14];

export function DocumentDesignForm({ business, plan }: { business: Business; plan: Plan }) {
  const router = useRouter();
  const supabase = createClient();

  const features = getPlanFeatures(plan);
  const [design, setDesign] = useState<DocDesignSettings>(() => {
    const d = business.document_design ?? DEFAULT_DOCUMENT_DESIGN;
    return { ...d, style: d.style === "template" ? "template" : normalizeStyle(d.style), accentColor: d.accentColor ?? DEFAULT_ACCENT };
  });
  const [signaturePreview, setSignaturePreview] = useState<string | null>(business.signature_url);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const { showLoader, hideLoader } = useGlobalLoader();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
    const usesSizes = Object.keys(design.sizes ?? {}).length > 0;
    if ((normalizeStyle(design.style) !== "simple" || usesSizes || Boolean(design.thermalTemplate)) && !features.colourfulStyles) {
      setError("Colourful, Templates, Custom styles, receipt styles and size adjustments are on the Pro plan. Use Simple, or upgrade to save these.");
      return;
    }
    setSaving(true);
    setError(null);
    showLoader("Saving document design…");

    function stopLoading() {
      setSaving(false);
      hideLoader();
    }

    let signatureUrl = signaturePreview;
    if (signatureFile) {
      const ext = signatureFile.name.split(".").pop();
      // Keyed by business id — each business has its own signature file.
      const path = `${business.id}/signature.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("signatures")
        .upload(path, signatureFile, { upsert: true });
      if (uploadErr) {
        stopLoading();
        setError(`Couldn't upload signature (${uploadErr.message}).`);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("signatures")
        .getPublicUrl(path);
      signatureUrl = publicUrlData.publicUrl;
    }

    const { error } = await supabase
      .from("businesses" as never)
      .update({
        document_design: design,
        signature_url: signatureUrl,
      } as never)
      .eq("id", business.id);
    stopLoading();
    if (error) {
      console.error("Zen Biz: failed to save document design", error);
      setError(error.message || "Could not save. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const style = design.style === "template" ? "template" : normalizeStyle(design.style);
  const isThermal = design.paperSize === "thermal" || design.paperSize === "thermal58";
  const custom = customOptions(design);
  const paidLocked = !features.colourfulStyles;

  function updateSizes(patch: Partial<DocSizes>) {
    setSaved(false);
    setDesign((prev) => ({ ...prev, sizes: { ...(prev.sizes ?? {}), ...patch } }));
  }

  function updateCustom(patch: Partial<DocCustomOptions>) {
    setSaved(false);
    setDesign((prev) => ({ ...prev, custom: { ...(prev.custom ?? {}), ...patch } }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">
          Document appearance
        </h2>
        <p className="text-sm text-text-soft">
          Applies to every Invoice, Quotation, and Purchase PDF. The preview on the right updates as you change things.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text">Paper size</p>
        <div className="grid gap-2 sm:grid-cols-2">
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
        <div className="grid gap-2 sm:grid-cols-2">
          {STYLE_OPTIONS.map((opt) => {
            const active = style === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ style: opt.value })}
                className={`relative flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2.5 text-left transition ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-paper-fold bg-white text-text hover:border-ink/40"
                }`}
              >
                <span className="text-sm font-semibold">{opt.label}</span>
                <span className={`text-xs ${active ? "text-paper/70" : "text-text-soft"}`}>
                  {opt.hint}
                </span>
                {opt.paid && paidLocked && (
                  <span className="absolute right-2 top-2 rounded-full bg-brass/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brass-dark">
                    Paid
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {style !== "simple" && paidLocked && (
          <p className="mt-2 rounded-lg bg-brass/10 px-3 py-2 text-xs text-brass-dark">
            You can preview this style, but saving it needs the Pro plan. Your documents keep using Simple until then.
          </p>
        )}
      </div>

      {style === "template" && !isThermal && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Choose a template</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DOC_TEMPLATES.map((t) => {
              const active = design.template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => update({ template: t.id, accentColor: t.accent })}
                  className={`flex flex-col gap-1.5 rounded-xl border p-2 text-left transition ${active ? "border-ink ring-2 ring-ink/20" : "border-paper-fold bg-white hover:border-ink/40"}`}
                >
                  <span className="relative block h-16 overflow-hidden rounded-md border border-paper-fold bg-white">
                    {t.header === "band" && <span className="absolute inset-x-0 top-0 h-4" style={{ backgroundColor: t.accent }} />}
                    {t.header === "sidebar" && <span className="absolute inset-y-0 left-0 w-4" style={{ backgroundColor: t.accent }} />}
                    {t.header === "center" && (
                      <>
                        <span className="absolute left-1/2 top-1.5 h-1.5 w-8 -translate-x-1/2 rounded-sm" style={{ backgroundColor: t.accent }} />
                        <span className="absolute left-1/2 top-4 h-0.5 w-12 -translate-x-1/2 bg-paper-fold" />
                      </>
                    )}
                    {t.header === "split" && (
                      <>
                        <span className="absolute left-1.5 top-1.5 h-1.5 w-6 rounded-sm bg-paper-fold" />
                        <span className="absolute right-1.5 top-1.5 h-2.5 w-8 rounded-sm" style={{ backgroundColor: t.accent }} />
                      </>
                    )}
                    {(t.header === "left" || t.header === "minimal") && (
                      <>
                        <span className="absolute left-1.5 top-1.5 h-1.5 w-8 rounded-sm" style={{ backgroundColor: t.accent }} />
                        <span className="absolute inset-x-1.5 top-4 h-0.5" style={{ backgroundColor: t.header === "left" ? t.accent : "transparent" }} />
                      </>
                    )}
                    <span className={`absolute right-1.5 top-6 h-3 rounded-sm ${t.parties === "cards" ? "w-[44%]" : "w-[30%]"}`} style={{ backgroundColor: t.accent, opacity: t.parties === "bar" ? 0.9 : 0.15 }} />
                    <span className="absolute left-5 top-6 h-3 w-[30%] rounded-sm" style={{ backgroundColor: t.accent, opacity: t.parties === "bar" ? 0.9 : 0.15 }} />
                    <span className="absolute inset-x-1.5 top-[2.35rem] h-1.5 rounded-sm" style={{ left: t.header === "sidebar" ? "1.25rem" : undefined, backgroundColor: t.accent, opacity: t.table === "solid" || t.table === "zebra" ? 1 : 0.25 }} />
                    <span className="absolute inset-x-1.5 top-[3.05rem] h-1 rounded-sm" style={{ left: t.header === "sidebar" ? "1.25rem" : undefined, backgroundColor: t.accent, opacity: t.table === "zebra" ? 0.2 : 0.07 }} />
                    <span className="absolute bottom-1 right-1.5 h-2 rounded-sm" style={{ width: t.totals === "bar" ? "70%" : "35%", backgroundColor: t.accent }} />
                  </span>
                  <span className="text-sm font-semibold text-text">{t.name}</span>
                  <span className="text-[0.7rem] leading-tight text-text-soft">{t.hint}</span>
                </button>
              );
            })}
          </div>
          {!design.template && <p className="mt-2 text-xs text-text-soft">Pick one to use it. You can still change its colour below.</p>}
        </div>
      )}

      {isThermal && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Receipt style</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[{ id: "", name: "Standard", hint: "Your current receipt" }, ...THERMAL_TEMPLATES].map((t) => {
              const active = (design.thermalTemplate ?? "") === t.id;
              return (
                <button
                  key={t.id || "standard"}
                  type="button"
                  onClick={() => update({ thermalTemplate: t.id || undefined })}
                  className={`flex flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition ${active ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text hover:border-ink/40"}`}
                >
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className={`text-[0.7rem] leading-tight ${active ? "text-paper/70" : "text-text-soft"}`}>{t.hint}</span>
                </button>
              );
            })}
          </div>
          {paidLocked && <p className="mt-2 rounded-lg bg-brass/10 px-3 py-2 text-xs text-brass-dark">Receipt styles are on the Pro plan.</p>}
        </div>
      )}

      {style !== "simple" && !isThermal && (
        <div>
          <p className="mb-2 text-sm font-medium text-text">Colour</p>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.name}
                aria-label={c.name}
                onClick={() => update({ accentColor: c.hex })}
                className={`h-8 w-8 rounded-full border-2 transition ${
                  design.accentColor?.toLowerCase() === c.hex ? "border-ink ring-2 ring-ink/20" : "border-white shadow"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
            <label className="ml-1 flex items-center gap-2 text-xs text-text-soft">
              <input
                type="color"
                value={design.accentColor ?? DEFAULT_ACCENT}
                onChange={(e) => update({ accentColor: e.target.value })}
                className="h-8 w-10 cursor-pointer rounded border border-paper-fold bg-white p-0.5"
              />
              Any colour
            </label>
          </div>
        </div>
      )}

      {style === "custom" && (
        <div className="flex flex-col gap-4 rounded-xl border border-paper-fold bg-white p-4">
          <p className="text-sm font-medium text-text">Customize</p>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text">Font</span>
            <select
              value={custom.fontFamily}
              onChange={(e) => updateCustom({ fontFamily: e.target.value as DocFontFamily })}
              className="max-w-[260px] rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {SECTION_TOGGLES.map((t) => (
              <label key={t.key} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-paper-fold px-3 py-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={Boolean(custom[t.key])}
                  onChange={(e) => updateCustom({ [t.key]: e.target.checked } as Partial<DocCustomOptions>)}
                  className="h-4 w-4 accent-[#1f3a2d]"
                />
                {t.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-paper-fold bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-text">
            Adjust sizes{" "}
            {paidLocked && (
              <span className="ml-1 rounded-full bg-brass/15 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-brass-dark">
                Paid
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setDesign((prev) => ({ ...prev, sizes: undefined }));
            }}
            className="text-xs font-medium text-text-soft hover:text-text"
          >
            Reset to automatic
          </button>
        </div>
        {SIZE_CONTROLS.map((c) => {
          const value = design.sizes?.[c.key] ?? c.auto(design.fontSize);
          return (
            <label key={c.key} className="flex flex-col gap-1">
              <span className="flex items-center justify-between text-xs font-medium text-text">
                {c.label}
                <span className="font-normal text-text-soft">
                  {value}
                  {c.unit}
                </span>
              </span>
              <input
                type="range"
                min={c.min}
                max={c.max}
                step={c.step}
                value={value}
                onChange={(e) => updateSizes({ [c.key]: Number(e.target.value) } as Partial<DocSizes>)}
                className="w-full accent-[#1f3a2d]"
              />
            </label>
          );
        })}
        {paidLocked && (
          <p className="text-xs text-text-soft">
            You can try the sliders and see the preview. Saving size changes needs the Pro plan.
          </p>
        )}
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
          Shown above "Authorised Signatory" on every document PDF.
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

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-xl bg-ink px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>

    <div className="lg:sticky lg:top-4 lg:self-start">
      <LiveInvoicePreview
        business={business}
        plan={plan}
        design={design}
        signatureUrl={signaturePreview}
        bank={{
          bankName: business.bank_name,
          accountName: business.bank_account_name,
          accountNumber: business.bank_account_number,
          ifscOrSwift: business.bank_ifsc_or_swift,
        }}
        qrUrl={business.payment_qr_url}
      />
    </div>
    </div>
  );
}
