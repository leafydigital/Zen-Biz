"use client";

import { useEffect, useRef, useState } from "react";
import { generateSaleDocumentPdf } from "@/lib/generateSaleDocumentPdf";
import type { Business, DocDesignSettings, Plan } from "@/types/database";

const SAMPLE_ITEMS = [
  { description: "Sample product", quantity: 2, unit: "pcs", item_code: null, hsn_code: "7113", unit_price: 500, line_total: 1000 },
  { description: "Sample service charge", quantity: 1, unit: "", item_code: null, hsn_code: "9983", unit_price: 750, line_total: 750 },
];

export interface PreviewBank {
  bankName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  ifscOrSwift?: string | null;
}

/**
 * A live PDF preview that redraws a moment after any setting changes.
 * Uses the exact same generator as real invoices, so what you see is
 * what gets downloaded.
 */
export function LiveInvoicePreview({
  business,
  plan,
  design,
  signatureUrl,
  bank,
  qrUrl,
}: {
  business: Business;
  plan: Plan;
  design: DocDesignSettings;
  signatureUrl: string | null;
  bank: PreviewBank;
  qrUrl: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastUrl = useRef<string | null>(null);

  const key = JSON.stringify([
    design, signatureUrl, bank, qrUrl, plan,
    business.logo_url, business.business_name, business.address, business.state,
    business.phone, business.gst_number, business.invoice_terms, business.default_currency,
  ]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const blob = (await generateSaleDocumentPdf({
          docLabel: "INVOICE",
          docNumber: "INV-0001",
          docDate: new Date().toISOString().slice(0, 10),
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
          status: "unpaid",
          paymentMethod: "bank_transfer",
          placeOfSupply: business.state,
          partyLabel: "Bill to",
          party: { name: "Sample Customer", phone: "+91 90000 00000", address: "123 Sample Street, Your City", gstin: "-" },
          items: SAMPLE_ITEMS,
          subtotal: 1750,
          gstEnabled: true,
          gstPercent: 18,
          gstAmount: 315,
          cgstAmount: 157.5,
          sgstAmount: 157.5,
          igstAmount: 0,
          total: 2065,
          notes: null,
          profile: { ...business, plan } as never,
          filenamePrefix: "Preview",
          design,
          terms: business.invoice_terms,
          signatureUrl,
          currency: "INR",
          bankDetails: bank,
          qrUrl,
          preview: true,
        })) as Blob;
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
        lastUrl.current = next;
        setUrl(next);
        setError(null);
      } catch (e) {
        console.error("Zen Biz: preview failed", e);
        if (!cancelled) setError("The preview couldn't be drawn. Your settings are still fine.");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    return () => {
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text">Live preview</p>
        <span className="text-xs text-text-soft">{busy ? "Updating…" : "Sample data"}</span>
      </div>
      <div className="relative overflow-hidden rounded-xl border border-paper-fold bg-paper">
        {url ? (
          <iframe
            title="Invoice preview"
            src={`${url}#toolbar=0&navpanes=0&view=FitH`}
            className="h-[70vh] min-h-[480px] w-full bg-white"
          />
        ) : (
          <div className="flex h-[70vh] min-h-[480px] items-center justify-center text-sm text-text-soft">
            {error ?? "Drawing preview…"}
          </div>
        )}
        {error && url && (
          <p className="absolute inset-x-0 bottom-0 bg-alert-bg px-3 py-1.5 text-xs text-alert">{error}</p>
        )}
      </div>
    </div>
  );
}
