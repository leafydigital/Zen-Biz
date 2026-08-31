"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generatePurchasePdf } from "@/lib/generatePurchasePdf";
import { CURRENCY_OPTIONS, CURRENCY_SYMBOLS } from "@/types/database";
import { PAYMENT_METHOD_OPTIONS, PAYMENT_STATUS_OPTIONS } from "@/lib/paymentOptions";
import {
  TAX_TYPE_OPTIONS,
  calculateGstLine,
  calculateRoundOff,
  isSameState,
  splitGstAmount,
} from "@/lib/gstCalculations";
import type {
  PaymentMethod,
  Product,
  Profile,
  Purchase,
  PurchaseStatus,
  Supplier,
  TaxType,
} from "@/types/database";

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

export function NewPurchaseForm({
  ownerId,
  profile,
  suppliers,
  products,
  suggestedPurchaseNumber,
}: {
  ownerId: string;
  profile: Profile;
  suppliers: Supplier[];
  products: Product[];
  suggestedPurchaseNumber: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [purchaseNumber, setPurchaseNumber] = useState(suggestedPurchaseNumber);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState<string>("");
  const [currency, setCurrency] = useState(profile.default_currency ?? "INR");

  const [paymentStatus, setPaymentStatus] = useState<PurchaseStatus>("unpaid");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [amountPaid, setAmountPaid] = useState("");

  const [taxType, setTaxType] = useState<TaxType>("exclusive");
  const gstApplies = taxType === "inclusive" || taxType === "exclusive";

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [transportName, setTransportName] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId) ?? null;

  const lineResults = useMemo(
    () =>
      lines.map((l) => ({
        line: l,
        result: calculateGstLine(
          { quantity: l.quantity, unitPrice: l.unitPrice, discountPercent: l.discountPercent, taxPercent: l.taxPercent },
          taxType
        ),
      })),
    [lines, taxType]
  );

  const subtotal = useMemo(
    () => lineResults.reduce((sum, { result }) => sum + result.taxableAmount, 0),
    [lineResults]
  );
  const totalTax = useMemo(
    () => lineResults.reduce((sum, { result }) => sum + result.taxAmount, 0),
    [lineResults]
  );

  const sameState = isSameState(profile.state, selectedSupplier?.state ?? null);
  const gstSplit = gstApplies
    ? splitGstAmount(totalTax, sameState)
    : { cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };

  const preRoundTotal = subtotal + totalTax;
  const { rounded: grandTotal, roundOff } = calculateRoundOff(preRoundTotal);

  const amountDue =
    paymentStatus === "partial"
      ? Math.max(0, grandTotal - (parseFloat(amountPaid) || 0))
      : paymentStatus === "paid"
        ? 0
        : grandTotal;

  const stockTrackedLinesCount = useMemo(
    () =>
      lines.filter((l) => {
        const p = products.find((prod) => prod.id === l.productId);
        return p && p.stock_qty !== null;
      }).length,
    [lines, products]
  );

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
    if (!purchaseNumber.trim()) {
      setError("Give this purchase a reference number.");
      return;
    }
    if (paymentStatus === "partial" && (parseFloat(amountPaid) || 0) <= 0) {
      setError("Enter how much has been paid so far for a partial payment.");
      return;
    }

    setSaving(true);

    const { data: purchaseData, error: pErr } = await supabase
      .from("purchases" as never)
      .insert({
        owner_id: ownerId,
        supplier_id: supplierId || null,
        purchase_number: purchaseNumber.trim(),
        purchase_date: purchaseDate,
        status: paymentStatus,
        payment_method: paymentStatus === "unpaid" ? null : paymentMethod || null,
        amount_paid:
          paymentStatus === "partial" ? parseFloat(amountPaid) || 0 : paymentStatus === "paid" ? grandTotal : 0,
        currency,
        delivery_address: deliveryAddress.trim() || null,
        vehicle_number: vehicleNumber.trim() || null,
        transport_name: transportName.trim() || null,
        tax_type: taxType,
        place_of_supply_state: gstApplies ? selectedSupplier?.state ?? profile.state ?? null : null,
        subtotal,
        gst_enabled: gstApplies,
        gst_percent: gstApplies && lines.length > 0 ? lines[0].taxPercent : 0,
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

    const purchase = purchaseData as Purchase | null;

    if (pErr || !purchase) {
      setSaving(false);
      console.error("Zen Biz: failed to save purchase", pErr);
      setError(pErr?.message ?? "Could not save the purchase.");
      return;
    }

    const itemsPayload = validLines.map((l) => {
      const result = calculateGstLine(
        { quantity: l.quantity, unitPrice: l.unitPrice, discountPercent: l.discountPercent, taxPercent: l.taxPercent },
        taxType
      );
      return {
        owner_id: ownerId,
        purchase_id: purchase.id,
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

    // Saving these rows is what triggers the automatic stock increase in the
    // database (see the adjust_stock_on_purchase trigger) — no extra call
    // needed here, it happens as a side effect of this insert.
        const { error: itemsErr } = await supabase.from("purchase_items" as never).insert(itemsPayload as never);

    setSaving(false);
    if (itemsErr) {
      setError(itemsErr.message);
      return;
    }

    if (download) {
      const supplier = suppliers.find((s) => s.id === supplierId) ?? null;
      await generatePurchasePdf({
        purchase,
        items: itemsPayload.map((it, i) => ({
          id: String(i),
          owner_id: ownerId,
          purchase_id: purchase.id,
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
        supplier,
        profile,
      });
    }

    router.push("/dashboard/purchases");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
      <div className="flex flex-1 flex-col gap-6">
        {/* Supplier Information */}
        <section className="rounded-2xl border border-paper-fold bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.06] text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="font-display text-lg font-semibold text-text">Supplier Information</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-sm font-medium text-text">Supplier</span>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              >
                <option value="">Not specified</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {selectedSupplier ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-soft">Phone</span>
                  <p className="text-sm text-text">{selectedSupplier.phone || "—"}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-soft">GSTIN</span>
                  <p className="font-ledger text-sm text-text">{selectedSupplier.gstin || "—"}</p>
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-text-soft">Address</span>
                  <p className="text-sm text-text">
                    {selectedSupplier.address || "—"}
                    {selectedSupplier.state ? ` · ${selectedSupplier.state}` : ""}
                  </p>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-soft sm:col-span-2">
                Pick a supplier to see their phone, GSTIN, and address here.
              </p>
            )}
          </div>
        </section>

        {/* Purchase Details */}
        <section className="rounded-2xl border border-paper-fold bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.06] text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 3v4a1 1 0 0 0 1 1h4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9 13h6M9 17h6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="font-display text-lg font-semibold text-text">Purchase Details</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Purchase number</span>
              <input
                required
                value={purchaseNumber}
                onChange={(e) => setPurchaseNumber(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Date</span>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
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

        {/* Payment */}
        <section className="rounded-2xl border border-paper-fold bg-white p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.06] text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="5" width="20" height="14" rx="2.5" />
                <path d="M2 10h20" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className="font-display text-lg font-semibold text-text">Payment</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Payment status</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PAYMENT_STATUS_OPTIONS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setPaymentStatus(s.value as PurchaseStatus)}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                      paymentStatus === s.value
                        ? "border-ink bg-ink text-paper"
                        : "border-paper-fold text-text hover:border-ink/40"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentStatus !== "unpaid" && paymentStatus !== "cancelled" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text">Payment method</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                >
                  <option value="">Select method…</option>
                  {PAYMENT_METHOD_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {paymentStatus === "partial" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text">Amount paid so far</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                />
                <span className="text-xs text-text-soft">
                  Balance due: {formatCurrency(amountDue, currency)}
                </span>
              </label>
            )}
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
                  className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition ${
                    taxType === opt.value
                      ? "border-ink bg-ink text-paper"
                      : "border-paper-fold text-text hover:border-ink/40"
                  }`}
                >
                  <span className="text-xs font-semibold">{opt.label}</span>
                  <span className={`text-[0.68rem] ${taxType === opt.value ? "text-paper/70" : "text-text-soft"}`}>
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </label>

          <div className="mb-1.5 hidden grid-cols-[1.3fr_0.55fr_0.55fr_0.75fr_0.55fr_0.55fr_28px] gap-2 px-1 text-[0.68rem] font-medium uppercase tracking-wide text-text-soft lg:grid">
            <span>Item</span>
            <span>Qty</span>
            <span>Unit</span>
            <span>Rate</span>
            <span>Disc %</span>
            {gstApplies && <span>GST %</span>}
            <span />
          </div>

          <div className="flex flex-col gap-3">
            {lineResults.map(({ line, result }) => (
              <div
                key={line.id}
                className="grid grid-cols-1 gap-2 rounded-xl border border-paper-fold bg-paper/40 p-3 lg:grid-cols-[1.3fr_0.55fr_0.55fr_0.75fr_0.55fr_0.55fr_28px] lg:items-center lg:gap-2"
              >
                <div className="flex flex-col gap-1.5">
                  <select
                    value={line.productId ?? ""}
                    onChange={(e) => selectProduct(line.id, e.target.value)}
                    className="rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                  >
                    <option value="">Custom item…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.stock_qty !== null ? ` (${p.stock_qty} in stock)` : ""}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Description"
                    value={line.description}
                    onChange={(e) => updateLine(line.id, { description: e.target.value })}
                    className="rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                  />
                  <div className="flex gap-1.5">
                    <input
                      placeholder="Item code"
                      aria-label="Item code"
                      value={line.itemCode}
                      onChange={(e) => updateLine(line.id, { itemCode: e.target.value })}
                      className="w-1/2 rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-xs text-text focus:border-ink"
                    />
                    <input
                      placeholder="HSN/SAC"
                      aria-label="HSN or SAC code"
                      value={line.hsnCode}
                      onChange={(e) => updateLine(line.id, { hsnCode: e.target.value })}
                      className="w-1/2 rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-xs text-text focus:border-ink"
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
                  className="rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                />

                <input
                  placeholder="unit"
                  aria-label="Unit"
                  value={line.unit}
                  onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                  className="rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                />

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Rate"
                  aria-label="Rate"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                  className="rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
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
                  className="rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                />

                {gstApplies && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    aria-label="GST percent"
                    value={line.taxPercent}
                    onChange={(e) => updateLine(line.id, { taxPercent: parseFloat(e.target.value) || 0 })}
                    className="rounded-lg border border-paper-fold bg-white px-2.5 py-2 text-sm text-text focus:border-ink"
                  />
                )}

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

          {stockTrackedLinesCount > 0 && (
            <p className="mt-3 rounded-lg bg-success-bg px-3 py-2 text-xs text-success">
              Saving this purchase will automatically add these quantities to
              stock for {stockTrackedLinesCount} item
              {stockTrackedLinesCount > 1 ? "s" : ""} that track inventory.
            </p>
          )}
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
                placeholder="Where the goods were delivered"
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
          <h3 className="mb-3 font-display text-lg font-semibold text-text">
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
                Add a state to your business Settings and this supplier to
                split CGST/SGST vs IGST automatically — showing as IGST for
                now.
              </p>
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

            <div className="mt-1 flex items-center justify-between border-t border-paper-fold pt-3">
              <span className="font-semibold text-text">Grand Total</span>
              <span className="font-ledger text-xl font-bold tabular-nums text-ink">
                {formatCurrency(grandTotal, currency)}
              </span>
            </div>

            {paymentStatus === "partial" && (
              <div className="mt-1 flex items-center justify-between rounded-lg bg-brass/10 px-2.5 py-2 text-xs">
                <span className="font-medium text-brass-dark">Balance due</span>
                <span className="font-ledger font-semibold tabular-nums text-brass-dark">
                  {formatCurrency(amountDue, currency)}
                </span>
              </div>
            )}
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
              {saving ? "Saving…" : "Save purchase"}
            </button>
          </div>
        </div>
      </aside>
    </form>
  );
}
