"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateQuotationPdf } from "@/lib/generateQuotationPdf";
import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS } from "@/types/database";
import {
  TAX_TYPE_OPTIONS,
  TAX_PERCENT_OPTIONS,
  calculateGstLine,
  calculateRoundOff,
  isSameState,
  splitGstAmount,
} from "@/lib/gstCalculations";
import type { Customer, GstPricingMode, Product, Profile, Quotation, TaxType } from "@/types/database";

interface LineItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unit: string;
  itemCode: string;
  hsnCode: string;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}

function newLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    productId: null,
    description: "",
    quantity: 1,
    unit: "item",
    itemCode: "",
    hsnCode: "",
    unitPrice: 0,
    discountPercent: 0,
    taxPercent: 0,
  };
}

function formatCurrency(n: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function NewQuotationForm({
  ownerId,
  profile,
  customers,
  products,
  suggestedQuotationNumber,
}: {
  ownerId: string;
  profile: Profile;
  customers: Customer[];
  products: Product[];
  suggestedQuotationNumber: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [quotationNumber, setQuotationNumber] = useState(suggestedQuotationNumber);
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [currency, setCurrency] = useState(profile.default_currency ?? "INR");
  const [shipToSameAsBill, setShipToSameAsBill] = useState(true);
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");
  const [taxType, setTaxType] = useState<TaxType>("gst");
  const [gstPricingMode, setGstPricingMode] = useState<GstPricingMode>("exclusive");
  const gstApplies = taxType === "gst";
  const taxApplies = taxType === "gst" || taxType === "tax";
  const itemsGridCols = taxApplies
    ? "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,4rem)_minmax(0,4rem)_minmax(0,4.5rem)_minmax(0,3.5rem)_minmax(0,3.5rem)_minmax(0,5rem)_20px]"
    : "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,4rem)_minmax(0,4rem)_minmax(0,4.5rem)_minmax(0,3.5rem)_minmax(0,5rem)_20px]";
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transportName, setTransportName] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  const lineResults = useMemo(
    () =>
      lines.map((l) => ({
        line: l,
        result: calculateGstLine(
          { quantity: l.quantity, unitPrice: l.unitPrice, discountPercent: l.discountPercent, taxPercent: l.taxPercent },
          taxType,
          gstPricingMode
        ),
      })),
    [lines, taxType, gstPricingMode]
  );

  const subtotal = useMemo(
    () => lineResults.reduce((sum, { result }) => sum + result.taxableAmount, 0),
    [lineResults]
  );
  const totalTax = useMemo(
    () => lineResults.reduce((sum, { result }) => sum + result.taxAmount, 0),
    [lineResults]
  );

  const sameState = isSameState(profile.state, selectedCustomer?.state ?? null);
  const gstSplit = gstApplies
    ? splitGstAmount(totalTax, sameState)
    : { cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };

  const preRoundTotal = subtotal + totalTax;
  const { rounded: grandTotal, roundOff } = calculateRoundOff(preRoundTotal);

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function selectProduct(id: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateLine(id, {
      productId: productId || null,
      description: product ? product.name : "",
      unitPrice: product ? Number(product.price) : 0,
      unit: product ? product.unit : "item",
      itemCode: product?.item_code ?? "",
      hsnCode: product?.hsn_code ?? "",
      taxPercent: product?.tax_percent ? Number(product.tax_percent) : 0,
    });
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  async function handleSubmit(e: React.FormEvent, download: boolean) {
    e.preventDefault();
    setError(null);

    const validLines = lines.filter((l) => l.description.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      setError("Add at least one item with a description and quantity.");
      return;
    }
    if (!quotationNumber.trim()) {
      setError("Give this quotation a number.");
      return;
    }

    setSaving(true);

    const { data: quotationData, error: qErr } = await supabase
      .from("quotations" as never)
      .insert({
        owner_id: ownerId,
        customer_id: customerId || null,
        quotation_number: quotationNumber.trim(),
        quotation_date: quotationDate,
        valid_until: validUntil || null,
        status: "draft",
        currency,
        ship_to_name: shipToSameAsBill ? null : shipToName.trim() || null,
        ship_to_address: shipToSameAsBill ? null : shipToAddress.trim() || null,
        delivery_address: deliveryAddress.trim() || null,
        vehicle_number: vehicleNumber.trim() || null,
        transport_name: transportName.trim() || null,
        tax_type: taxType,
        place_of_supply_state: gstApplies ? selectedCustomer?.state ?? profile.state ?? null : null,
        subtotal,
        gst_enabled: taxApplies,
        gst_percent: taxApplies && lines.length > 0 ? lines[0].taxPercent : 0,
        gst_amount: totalTax,
        cgst_amount: gstSplit.cgstAmount,
        sgst_amount: gstSplit.sgstAmount,
        igst_amount: gstSplit.igstAmount,
        round_off: roundOff,
        total: grandTotal,
        notes: notes.trim() || null,
      } as never)
      .select()
      .single();

    const quotation = quotationData as Quotation | null;

    if (qErr || !quotation) {
      setSaving(false);
      console.error("Zen Biz: failed to save quotation", qErr);
      setError(qErr?.message ?? "Could not save the quotation.");
      return;
    }

    const itemsPayload = validLines.map((l) => {
      const result = calculateGstLine(
        { quantity: l.quantity, unitPrice: l.unitPrice, discountPercent: l.discountPercent, taxPercent: l.taxPercent },
        taxType,
        gstPricingMode
      );
      return {
        owner_id: ownerId,
        quotation_id: quotation.id,
        product_id: l.productId,
        description: l.description.trim(),
        quantity: l.quantity,
        unit: l.unit.trim() || "item",
        item_code: l.itemCode.trim() || null,
        hsn_code: l.hsnCode.trim() || null,
        unit_price: l.unitPrice,
        discount_percent: l.discountPercent,
        tax_percent: l.taxPercent,
        tax_amount: result.taxAmount,
        line_total: result.taxableAmount,
      };
    });

        const { error: itemsErr } = await supabase.from("quotation_items" as never).insert(itemsPayload as never);

    setSaving(false);
    if (itemsErr) {
      setError(itemsErr.message);
      return;
    }

    if (download) {
      const customer = customers.find((c) => c.id === customerId) ?? null;
      await generateQuotationPdf({
        quotation,
        items: itemsPayload.map((it, i) => ({
          id: String(i),
          owner_id: ownerId,
          quotation_id: quotation.id,
          product_id: it.product_id,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          item_code: it.item_code,
          hsn_code: it.hsn_code,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
          tax_percent: it.tax_percent,
          tax_amount: it.tax_amount,
          line_total: it.line_total,
          created_at: new Date().toISOString(),
        })),
        customer,
        profile,
      });
    }

    router.push("/dashboard/quotations");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
      <div className="flex flex-1 flex-col gap-6">
        {/* Customer Information */}
        <section className="rounded-2xl border border-paper-fold bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.06] text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="font-display text-lg font-semibold text-text">Customer Information</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-text">Customer</span>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              >
                <option value="">Not specified</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedCustomer ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-soft">Phone</span>
                  <p className="text-sm text-text">{selectedCustomer.phone || "—"}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-soft">GSTIN</span>
                  <p className="font-ledger text-sm text-text">{selectedCustomer.gstin || "—"}</p>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-soft">
                    Billing Address
                  </span>
                  <p className="text-sm text-text">
                    {selectedCustomer.address || "—"}
                    {selectedCustomer.state ? ` · ${selectedCustomer.state}` : ""}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-soft sm:col-span-2">
                Pick a customer to see their phone, GSTIN, and address here.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-paper-fold bg-paper/60 p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-medium text-text">Shipping address same as billing</span>
              <span className="relative inline-flex shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={shipToSameAsBill}
                  onChange={(e) => setShipToSameAsBill(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-paper-fold transition-colors peer-checked:bg-ink" />
                <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
            {!shipToSameAsBill && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text">Ship to name</span>
                  <input
                    value={shipToName}
                    onChange={(e) => setShipToName(e.target.value)}
                    placeholder="Recipient name"
                    className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text">Shipping address</span>
                  <input
                    value={shipToAddress}
                    onChange={(e) => setShipToAddress(e.target.value)}
                    placeholder="Delivery address"
                    className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
                  />
                </label>
              </div>
            )}
          </div>
        </section>

        {/* Quotation Details */}
        <section className="rounded-2xl border border-paper-fold bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.06] text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="font-display text-lg font-semibold text-text">Quotation Details</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Quotation number</span>
              <input
                required
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Date</span>
              <input
                type="date"
                required
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">
                Valid until <span className="text-text-soft">(optional)</span>
              </span>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Currency</span>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Items */}
        <section className="rounded-2xl border border-paper-fold bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.06] text-ink">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 7 12 3 4 7l8 4 8-4Z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 7v10l8 4 8-4V7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 11v10" strokeLinecap="round" />
                </svg>
              </span>
              <h2 className="font-display text-lg font-semibold text-text">Items</h2>
            </div>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add line
            </button>
          </div>

          <label className="mb-4 flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Tax type</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TAX_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTaxType(opt.value)}
                  className={`flex h-full flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition ${
                    taxType === opt.value
                      ? "border-ink bg-ink text-paper"
                      : "border-paper-fold text-text hover:border-ink/40"
                  }`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className={`text-[0.68rem] leading-snug ${taxType === opt.value ? "text-paper/70" : "text-text-soft"}`}>
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </label>

          {gstApplies && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-medium text-text-soft">Rate is:</span>
              <div className="flex gap-1.5">
                {(["exclusive", "inclusive"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGstPricingMode(mode)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                      gstPricingMode === mode
                        ? "border-ink bg-ink text-paper"
                        : "border-paper-fold text-text hover:border-ink/40"
                    }`}
                  >
                    {mode === "exclusive" ? "GST extra" : "GST included"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`mb-1.5 hidden gap-2 px-1 text-[0.68rem] font-medium uppercase tracking-wide text-text-soft lg:grid ${itemsGridCols}`}>
            <span>Item</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Rate</span>
            <span>Disc %</span>
            {taxApplies && <span>{gstApplies ? "GST %" : "Tax %"}</span>}
            <span className="text-right">Amount</span>
            <span />
          </div>

          <div className="flex flex-col gap-3">
            {lineResults.map(({ line, result }) => (
              <div
                key={line.id}
                className={`grid grid-cols-1 gap-2 rounded-xl border border-paper-fold bg-paper/40 p-3 lg:items-center lg:gap-2 ${itemsGridCols}`}
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <select
                    value={line.productId ?? ""}
                    onChange={(e) => selectProduct(line.id, e.target.value)}
                    className="w-full min-w-0 rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                  >
                    <option value="">Custom item…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, { description: e.target.value })}
                    className="w-full min-w-0 rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                  />
                  <div className="flex min-w-0 gap-1.5">
                    <input
                      placeholder="Item code"
                      aria-label="Item code"
                      value={line.itemCode}
                      onChange={(e) => updateLine(line.id, { itemCode: e.target.value })}
                      className="w-1/2 min-w-0 rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-xs text-text focus:border-ink"
                    />
                    <input
                      placeholder="HSN/SAC"
                      aria-label="HSN or SAC code"
                      value={line.hsnCode}
                      onChange={(e) => updateLine(line.id, { hsnCode: e.target.value })}
                      className="w-1/2 min-w-0 rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-xs text-text focus:border-ink"
                    />
                  </div>
                </div>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Qty"
                  aria-label="Quantity"
                  value={line.quantity}
                  onChange={(e) => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                  className="w-full min-w-0 rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                />

                <input
                  placeholder="unit"
                  aria-label="Unit"
                  value={line.unit}
                  onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                  className="w-full min-w-0 rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Rate"
                  aria-label="Rate"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                  className="w-full min-w-0 rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                />

                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                  aria-label="Discount percent"
                  value={line.discountPercent}
                  onChange={(e) => updateLine(line.id, { discountPercent: parseFloat(e.target.value) || 0 })}
                  className="w-full min-w-0 rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                />

                {taxApplies && (
                  <div className="flex min-w-0 gap-1">
                    <select
                      aria-label={gstApplies ? "GST percent" : "Tax percent"}
                      value={TAX_PERCENT_OPTIONS.includes(line.taxPercent) ? String(line.taxPercent) : "custom"}
                      onChange={(e) => {
                        if (e.target.value === "custom") return;
                        updateLine(line.id, { taxPercent: parseFloat(e.target.value) });
                      }}
                      className="w-full min-w-0 rounded-lg border border-paper-fold bg-white px-1.5 py-2 text-sm text-text focus:border-ink"
                    >
                      {TAX_PERCENT_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}%
                        </option>
                      ))}
                      <option value="custom">Custom</option>
                    </select>
                    {!TAX_PERCENT_OPTIONS.includes(line.taxPercent) && (
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="%"
                        aria-label="Custom tax percent"
                        value={line.taxPercent}
                        onChange={(e) => updateLine(line.id, { taxPercent: parseFloat(e.target.value) || 0 })}
                        className="w-14 min-w-0 shrink-0 rounded-lg border border-paper-fold bg-white px-1.5 py-2 text-sm text-text focus:border-ink"
                      />
                    )}
                  </div>
                )}

                <div className="hidden text-right lg:block">
                  <span className="font-ledger text-sm font-semibold tabular-nums text-text">
                    {formatCurrency(result.taxableAmount, currency)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className="justify-self-end text-text-soft transition hover:text-alert lg:justify-self-center"
                  aria-label="Remove line"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                <div className="col-span-full flex items-center justify-between border-t border-paper-fold pt-2 text-sm lg:hidden">
                  <span className="text-text-soft">Amount</span>
                  <span className="font-ledger font-semibold tabular-nums text-text">
                    {formatCurrency(result.taxableAmount, currency)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Extra */}
        <section className="rounded-2xl border border-paper-fold bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.06] text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 17h1m4 0h9.5a2.5 2.5 0 0 0 0-5H15V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="7.5" cy="17.5" r="1.7" />
                <circle cx="16.5" cy="17.5" r="1.7" />
              </svg>
            </span>
            <h2 className="font-display text-lg font-semibold text-text">Transport & Notes</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-text">
                Delivery address <span className="text-text-soft">(optional)</span>
              </span>
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Where the goods would be delivered"
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">
                Vehicle number <span className="text-text-soft">(optional)</span>
              </span>
              <input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. TN 09 AB 1234"
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">
                Transport name <span className="text-text-soft">(optional)</span>
              </span>
              <input
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                placeholder="Courier or transporter"
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-text">
                Notes <span className="text-text-soft">(optional)</span>
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-text-soft">
            Terms & Conditions, Signature, and Bank Details print automatically
            from your Settings — nothing to fill in here.
          </p>
        </section>

        {error && (
          <p className="rounded-xl bg-alert-bg px-4 py-3 text-sm text-alert" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Sticky totals sidebar */}
      <aside className="lg:w-80 lg:shrink-0">
        <div className="rounded-2xl border border-paper-fold bg-white p-4 shadow-card lg:sticky lg:top-6 lg:p-5">
          <h3 className="mb-3 border-b border-paper-fold pb-3 font-display text-lg font-semibold text-text">
            Total
          </h3>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-soft">Subtotal</span>
              <span className="font-ledger tabular-nums text-text">
                {formatCurrency(subtotal, currency)}
              </span>
            </div>

            {gstApplies && sameState === true && totalTax > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-text-soft">CGST</span>
                  <span className="font-ledger tabular-nums text-text">
                    {formatCurrency(gstSplit.cgstAmount, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-soft">SGST</span>
                  <span className="font-ledger tabular-nums text-text">
                    {formatCurrency(gstSplit.sgstAmount, currency)}
                  </span>
                </div>
              </>
            )}
            {gstApplies && sameState !== true && totalTax > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-text-soft">IGST</span>
                <span className="font-ledger tabular-nums text-text">
                  {formatCurrency(gstSplit.igstAmount, currency)}
                </span>
              </div>
            )}
            {gstApplies && totalTax > 0 && sameState === null && (
              <p className="rounded-lg bg-brass/10 px-2.5 py-1.5 text-[0.7rem] text-brass-dark">
                Add a state to your business Settings and this customer to
                split CGST/SGST vs IGST automatically — showing as IGST for
                now.
              </p>
            )}

            {taxType === "tax" && totalTax > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-text-soft">Tax</span>
                <span className="font-ledger tabular-nums text-text">
                  {formatCurrency(totalTax, currency)}
                </span>
              </div>
            )}

            {roundOff !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-text-soft">Round off</span>
                <span className="font-ledger tabular-nums text-text">
                  {roundOff > 0 ? "+" : ""}
                  {formatCurrency(roundOff, currency)}
                </span>
              </div>
            )}

            <div className="-mx-4 mt-2 flex items-center justify-between bg-ink/[0.04] px-4 py-3 lg:-mx-5 lg:px-5">
              <span className="font-semibold text-text">Grand Total</span>
              <span className="font-ledger text-xl font-bold tabular-nums text-ink">
                {formatCurrency(grandTotal, currency)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={(e) => handleSubmit(e, true)}
              className="rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & Download PDF"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => handleSubmit(e, false)}
              className="rounded-xl border border-paper-fold px-4 py-3 text-sm font-semibold text-text transition hover:bg-paper disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save quotation"}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}
