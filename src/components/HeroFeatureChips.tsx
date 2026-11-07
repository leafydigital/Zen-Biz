"use client";

import { useEffect, useState } from "react";
import { BARCODE_STEPS, StepOne, StepThree, StepTwo } from "@/components/BarcodeScanDemo";
import { GstInvoiceArt, LabelSheetArt } from "@/components/FeatureArt";

type Demo = {
  id: string;
  chip: string;
  title: string;
  note: string;
  steps: { title: string; body: string }[];
  art: React.ReactNode[];
};

const DEMOS: Demo[] = [
  {
    id: "scan",
    chip: "Scan barcodes with your phone",
    title: "How barcode scanning works",
    note: "Camera scanning is on the Pro plan.",
    steps: BARCODE_STEPS,
    art: [<StepOne key="a" />, <StepTwo key="b" />, <StepThree key="c" />],
  },
  {
    id: "gst",
    chip: "GST invoices",
    title: "How GST invoices work",
    note: "GST billing and the GST report are on the Pro plan.",
    steps: [
      { title: "1. Add your GST number and HSN codes", body: "Enter your GSTIN once in Settings and put an HSN code and tax rate on each item." },
      { title: "2. Bill as usual", body: "Choose the customer and items. CGST and SGST (or IGST for another state) are worked out for you." },
      { title: "3. Download, share or print", body: "Send the PDF by WhatsApp or print it. Add e-way bill or e-invoice details when the sale needs them." },
    ],
    art: [<GstInvoiceArt key="g" />],
  },
  {
    id: "labels",
    chip: "Print labels",
    title: "How barcode label printing works",
    note: "Works with normal printers and sticker label paper.",
    steps: [
      { title: "1. Set your label size", body: "In Settings choose your sticker paper, one or two columns and the barcode design. A live preview shows exactly how it will look." },
      { title: "2. Pick the items", body: "In Stock, open an item or update its stock and choose Print labels. Every item already has its own barcode." },
      { title: "3. Print and stick", body: "Print on sticker paper from your phone or computer, peel and stick, and the products are ready to scan." },
    ],
    art: [<LabelSheetArt key="l" />],
  },
];

/** The three feature chips under the hero; each opens a short picture guide. */
export function HeroFeatureChips() {
  const [open, setOpen] = useState<string | null>(null);
  const demo = DEMOS.find((d) => d.id === open) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <ul className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-ink">
        {DEMOS.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => setOpen(d.id)}
              className="rounded-full border border-paper-fold bg-white px-3 py-1 transition hover:border-ink hover:bg-ink/5"
            >
              {d.chip}
            </button>
          </li>
        ))}
      </ul>

      {demo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" onClick={() => setOpen(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={demo.title}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-xl2 bg-paper-card p-5 shadow-card sm:rounded-xl2 sm:p-7"
          >
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Close"
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-paper-fold bg-white text-text-soft hover:bg-paper hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            <h2 className="pr-12 font-display text-xl font-semibold text-text">{demo.title}</h2>
            <p className="mt-1 text-sm text-text-soft">{demo.note}</p>

            {demo.art.length > 1 ? (
              <ol className="mt-5 grid gap-4 md:grid-cols-3">
                {demo.steps.map((s, i) => (
                  <li key={s.title} className="overflow-hidden rounded-xl2 border border-paper-fold bg-white">
                    {demo.art[i]}
                    <div className="p-4">
                      <h3 className="font-display text-sm font-semibold text-text">{s.title}</h3>
                      <p className="mt-1.5 text-sm text-text-soft">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-5 grid gap-5 md:grid-cols-2 md:items-center">
                <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-white">{demo.art[0]}</div>
                <ol className="flex flex-col gap-4">
                  {demo.steps.map((s) => (
                    <li key={s.title}>
                      <h3 className="font-display text-base font-semibold text-text">{s.title}</h3>
                      <p className="mt-1 text-sm text-text-soft">{s.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
