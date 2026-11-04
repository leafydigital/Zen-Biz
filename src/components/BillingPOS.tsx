"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calculateGstLine, calculateRoundOff } from "@/lib/gstCalculations";
import { CURRENCY_SYMBOLS } from "@/types/database";
import type { Plan, Product, TaxType } from "@/types/database";
import { ProductFormModal } from "@/components/ProductFormModal";
import { LimitReachedModal } from "@/components/LimitReachedModal";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { getPlanFeatures } from "@/lib/planFeatures";

type PayMethod = "cash" | "upi" | "credit_card";

export interface RecentBill {
  id: string;
  createdAt: string;
  total: number;
  subtotal: number;
  tax: number;
  roundOff: number;
  payMethod: string;
  items: { name: string; qty: number; price: number; amount: number }[];
}

interface ReceiptData {
  ref: string | null;
  date: Date;
  rows: { name: string; qty: number; price: number; amount: number }[];
  subtotal: number;
  tax: number;
  roundOff: number;
  total: number;
  payMethod: string;
  customerName?: string;
  customerPhone?: string;
}
type PaperWidth = 58 | 80;

function money(n: number, currency: string) {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function ProductThumb({ p, size, dim }: { p: Product; size: number; dim?: boolean }) {
  const style = { width: size, height: size };
  const cls = `shrink-0 rounded-lg object-cover ${dim ? "grayscale" : ""}`;
  if (p.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.image_url} alt={p.name} style={style} className={`${cls} border border-paper-fold`} />;
  }
  return (
    <div
      style={style}
      className={`${cls} flex items-center justify-center bg-blue-50 text-sm font-bold uppercase text-blue-600`}
    >
      {p.name.slice(0, 1)}
    </div>
  );
}

export function BillingPOS({
  ownerId,
  businessId,
  products,
  currency,
  business,
  plan,
  productLimit,
  labels,
  recent,
  canViewRecords,
  itemPerms,
}: {
  ownerId: string;
  businessId: string;
  products: Product[];
  currency: string;
  business: { name: string; address: string | null; phone: string | null; gstin: string | null };
  recent: RecentBill[];
  canViewRecords: boolean;
  itemPerms: { add: boolean; edit: boolean; hide: boolean; remove: boolean };
  plan: Plan;
  productLimit: number | null;
  labels: { itemSingular: string; defaultUnit: string; unitOptions: string[]; stockTrackingDefault: boolean; stockHint: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  useEffect(() => {
    document.documentElement.classList.add("on-billing");
    return () => document.documentElement.classList.remove("on-billing");
  }, []);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [paper, setPaper] = useState<PaperWidth>(80);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [manage, setManage] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanLockedOpen, setScanLockedOpen] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category?.trim()).filter(Boolean) as string[])).sort(),
    [products]
  );

  const visible = products.filter(
    (p) =>
      (category === null || p.category === category) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartLines = useMemo(
    () =>
      products
        .filter((p) => p.is_active && (cart[p.id] ?? 0) > 0)
        .map((p) => ({ product: p, qty: cart[p.id] })),
    [products, cart]
  );

  const anyTax = cartLines.some((l) => Number(l.product.tax_percent) > 0);
  const taxType: TaxType = anyTax ? "tax" : "non_tax";

  const totals = useMemo(() => {
    const rows = cartLines.map(({ product, qty }) => ({
      product,
      qty,
      result: calculateGstLine(
        { quantity: qty, unitPrice: Number(product.price), discountPercent: 0, taxPercent: Number(product.tax_percent) || 0 },
        taxType
      ),
    }));
    const subtotal = rows.reduce((s, r) => s + r.result.taxableAmount, 0);
    const tax = rows.reduce((s, r) => s + r.result.taxAmount, 0);
    const { rounded, roundOff } = calculateRoundOff(subtotal + tax);
    return { rows, subtotal, tax, total: rounded, roundOff };
  }, [cartLines, taxType]);

  const itemCount = cartLines.reduce((s, l) => s + l.qty, 0);

  function add(p: Product) {
    if (!p.is_active) return;
    setSavedId(null);
    setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }));
  }

  const canScan = getPlanFeatures(plan).barcodeScanning;

  /** Matches a scanned code against item codes; returns a message for the user. */
  function addByCode(raw: string): string {
    const code = raw.trim().toLowerCase();
    if (!code) return "";
    const p = products.find((x) => x.item_code?.trim().toLowerCase() === code);
    if (!p) return `No item with code "${raw.trim()}"`;
    if (!p.is_active) return `${p.name} is hidden`;
    add(p);
    return `Added ${p.name}`;
  }

  // USB / Bluetooth scanners type the code and press Enter — handle that in the search box.
  function onSearchEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" || !search.trim()) return;
    e.preventDefault();
    if (!canScan) return;
    const exact = products.find((x) => x.item_code?.trim().toLowerCase() === search.trim().toLowerCase());
    if (exact) {
      addByCode(search);
      setSearch("");
    } else if (visible.length === 1) {
      add(visible[0]);
      setSearch("");
    }
  }

  function remove(p: Product) {
    setCart((c) => {
      const next = { ...c };
      if ((next[p.id] ?? 0) <= 1) delete next[p.id];
      else next[p.id] -= 1;
      return next;
    });
  }

  function openForm(p: Product | null) {
    if (!p && productLimit !== null && products.length >= productLimit) {
      setLimitOpen(true);
      return;
    }
    setEditing(p);
    setFormOpen(true);
  }

  async function toggleActive(p: Product) {
    setBusyId(p.id);
    if (p.is_active) {
      setCart((c) => {
        const next = { ...c };
        delete next[p.id];
        return next;
      });
    }
    await supabase.from("products" as never).update({ is_active: !p.is_active } as never).eq("id", p.id);
    setBusyId(null);
    router.refresh();
  }

  async function removeProduct(p: Product) {
    if (!window.confirm(`Remove "${p.name}"?`)) return;
    setBusyId(p.id);
    setCart((c) => {
      const next = { ...c };
      delete next[p.id];
      return next;
    });
    const { error: delErr } = await supabase.from("products" as never).delete().eq("id", p.id);
    setBusyId(null);
    if (delErr) setError(delErr.message || "Could not remove the item.");
    router.refresh();
  }

  function clearCart() {
    setCart({});
    setCustName("");
    setCustPhone("");
    setError(null);
  }

  /** Receipt laid out for a thermal roll; printed through a hidden iframe. */
  function printReceipt(d: ReceiptData) {
    const now = d.date;
    const billRef = d.ref;
    const widthMm = paper === 58 ? 48 : 72;
    const rows = d.rows
      .map(
        (r) => `<tr><td colspan="3">${escapeHtml(r.name)}</td></tr>
<tr><td>${r.qty} x ${r.price.toFixed(2)}</td><td></td><td class="r">${r.amount.toFixed(2)}</td></tr>`
      )
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Bill</title><style>
@page { size: ${paper}mm auto; margin: 0; }
* { box-sizing: border-box; }
body { width: ${widthMm}mm; margin: 0 auto; padding: 3mm 0; font: 12px/1.35 "Courier New", monospace; color: #000; }
h1 { font-size: 15px; margin: 0; text-align: center; }
.c { text-align: center; } .r { text-align: right; white-space: nowrap; }
table { width: 100%; border-collapse: collapse; }
td { vertical-align: top; padding: 1px 0; }
hr { border: 0; border-top: 1px dashed #000; margin: 4px 0; }
.t td { font-weight: bold; font-size: 14px; }
</style></head><body>
<h1>${escapeHtml(business.name || "Bill")}</h1>
${business.address ? `<div class="c">${escapeHtml(business.address)}</div>` : ""}
${business.phone ? `<div class="c">Ph: ${escapeHtml(business.phone)}</div>` : ""}
${business.gstin ? `<div class="c">GSTIN: ${escapeHtml(business.gstin)}</div>` : ""}
<hr>
<div>${now.toLocaleDateString("en-IN")} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}${billRef ? ` &nbsp; #${escapeHtml(billRef)}` : ""}</div>
<hr>
<table>${rows}</table>
<hr>
<table>
<tr><td>Subtotal</td><td class="r">${d.subtotal.toFixed(2)}</td></tr>
${d.tax > 0 ? `<tr><td>Tax</td><td class="r">${d.tax.toFixed(2)}</td></tr>` : ""}
${Math.abs(d.roundOff) > 0.004 ? `<tr><td>Round off</td><td class="r">${d.roundOff.toFixed(2)}</td></tr>` : ""}
<tr class="t"><td>TOTAL</td><td class="r">${money(d.total, currency)}</td></tr>
</table>
<hr>
${d.customerName ? `<div>Customer: ${escapeHtml(d.customerName)}</div>` : ""}
${d.customerPhone ? `<div>Phone: ${escapeHtml(d.customerPhone)}</div>` : ""}
<div>Paid by: ${d.payMethod === "credit_card" ? "CARD" : d.payMethod.toUpperCase()}</div>
<div class="c" style="margin-top:6px">Thank you! Visit again.</div>
</body></html>`;

    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 60_000);
    }, 250);
  }

  function cartReceipt(ref: string | null): ReceiptData {
    return {
      ref,
      date: new Date(),
      rows: totals.rows.map((r) => ({ name: r.product.name, qty: r.qty, price: Number(r.product.price), amount: r.result.taxableAmount })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      roundOff: totals.roundOff,
      total: totals.total,
      payMethod,
      customerName: custName.trim() || undefined,
      customerPhone: custPhone.trim() || undefined,
    };
  }

  function reprint(b: RecentBill) {
    printReceipt({ ref: b.id.slice(0, 6).toUpperCase(), date: new Date(b.createdAt), rows: b.items, subtotal: b.subtotal, tax: b.tax, roundOff: b.roundOff, total: b.total, payMethod: b.payMethod });
  }

  function newBill() {
    setCart({});
    setCustName("");
    setCustPhone("");
    setError(null);
    setSavedId(null);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(): Promise<string | null> {
    setSaving(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);

    const { data: created, error: invErr } = await supabase
      .from("invoices" as never)
      .insert({
        owner_id: ownerId,
        business_id: businessId,
        customer_id: null,
        // Billing records carry a throwaway number; the column is NOT NULL.
        invoice_number: `DRAFT-${crypto.randomUUID().slice(0, 8)}`,
        record_type: "billing_record",
        invoice_date: today,
        due_date: null,
        status: "paid",
        payment_method: payMethod,
        amount_paid: totals.total,
        currency,
        tax_type: taxType,
        subtotal: totals.subtotal,
        gst_enabled: anyTax,
        gst_percent: anyTax ? Number(totals.rows[0]?.product.tax_percent) || 0 : 0,
        gst_amount: totals.tax,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        round_off: totals.roundOff,
        total: totals.total,
        notes: ["Created from POS", custName.trim() && `Customer: ${custName.trim()}`, custPhone.trim() && `Phone: ${custPhone.trim()}`]
          .filter(Boolean)
          .join("\n"),
      } as never)
      .select("id")
      .single();

    const invoiceId = (created as { id: string } | null)?.id;
    if (invErr || !invoiceId) {
      setSaving(false);
      setError(invErr?.message ?? "Could not save the bill.");
      return null;
    }

    const items = totals.rows.map((r) => ({
      owner_id: ownerId,
      business_id: businessId,
      invoice_id: invoiceId,
      product_id: r.product.id,
      description: r.product.name,
      quantity: r.qty,
      unit: r.product.unit || "item",
      item_code: r.product.item_code,
      hsn_code: r.product.hsn_code,
      unit_price: Number(r.product.price),
      discount_percent: 0,
      tax_percent: Number(r.product.tax_percent) || 0,
      tax_amount: r.result.taxAmount,
      line_total: r.result.taxableAmount,
    }));
    const { error: itemsErr } = await supabase.from("invoice_items" as never).insert(items as never);
    setSaving(false);
    if (itemsErr) {
      setError(itemsErr.message);
      return null;
    }
    return invoiceId;
  }

  async function handleSave(alsoPrint: boolean) {
    if (cartLines.length === 0) return;
    const id = await save();
    if (!id) return;
    if (alsoPrint) printReceipt(cartReceipt(id.slice(0, 6).toUpperCase()));
    setSavedId(id);
    setCart({});
    setCustName("");
    setCustPhone("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-xl2 border border-paper-fold bg-paper-card p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text">Previous bills</p>
          <button
            type="button"
            onClick={newBill}
            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ink-light"
          >
            + New bill
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="text-xs text-text-soft">No bills yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {recent.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-paper-fold bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="font-ledger text-sm font-semibold tabular-nums text-text">{money(b.total, currency)}</p>
                  <p className="truncate text-xs text-text-soft">
                    {new Date(b.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    {b.items.reduce((n, i) => n + i.qty, 0)} item(s)
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => reprint(b)} className="rounded-lg border border-paper-fold px-2.5 py-1 text-xs font-semibold text-text hover:bg-paper">
                    Print
                  </button>
                  {canViewRecords && (
                    <Link href={`/dashboard/billing-records/${b.id}`} className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-700">
                      View
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart strip: small icons with quantity, tap to add one more. */}
      <div className="sticky top-0 z-10 -mx-1 rounded-xl2 border border-paper-fold bg-paper-card p-3 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            {cartLines.length === 0 ? (
              <p className="py-2 text-sm text-text-soft">Tap an item below to start a bill.</p>
            ) : (
              cartLines.map(({ product, qty }) => (
                <div key={product.id} className="flex flex-col items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => add(product)}
                    className="relative"
                    aria-label={`Add one ${product.name}`}
                    title={product.name}
                  >
                    <ProductThumb p={product} size={40} />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink px-1 text-[0.65rem] font-bold text-paper">
                      {qty}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(product)}
                    className="rounded bg-paper-fold px-2 text-xs font-bold leading-4 text-text"
                    aria-label={`Remove one ${product.name}`}
                  >
                    −
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[0.7rem] uppercase tracking-wide text-text-soft">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
            <p className="font-ledger text-xl font-bold tabular-nums text-ink">{money(totals.total, currency)}</p>
          </div>
        </div>

        {cartLines.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-paper-fold pt-3">
            <input
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              placeholder="Customer name (optional)"
              className="min-w-0 flex-1 rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-xs text-text placeholder:text-text-soft/60 sm:max-w-[12rem]"
            />
            <input
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value.replace(/[^\d+ -]/g, ""))}
              inputMode="tel"
              placeholder="Phone (optional)"
              className="min-w-0 flex-1 rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-xs text-text placeholder:text-text-soft/60 sm:max-w-[10rem]"
            />
            <span className="basis-full" />
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value as PayMethod)}
              className="rounded-lg border border-paper-fold bg-white px-2 py-1.5 text-xs text-text"
              aria-label="Payment method"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="credit_card">Card</option>
            </select>
            <select
              value={paper}
              onChange={(e) => setPaper(Number(e.target.value) as PaperWidth)}
              className="rounded-lg border border-paper-fold bg-white px-2 py-1.5 text-xs text-text"
              aria-label="Thermal paper width"
            >
              <option value={80}>80mm paper</option>
              <option value={58}>58mm paper</option>
            </select>
            <button type="button" onClick={clearCart} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-alert">
              Clear
            </button>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => printReceipt(cartReceipt(null))}
                className="rounded-lg border border-paper-fold bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-paper disabled:opacity-60"
              >
                Print only
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(false)}
                className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save record"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ink-light disabled:opacity-60"
              >
                Save &amp; print
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {savedId && (
        <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success">
          Bill saved.{" "}
          {canViewRecords && (
            <Link href={`/dashboard/billing-records/${savedId}`} className="font-semibold underline">
              View record
            </Link>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={onSearchEnter}
          placeholder={canScan ? "Search items or scan barcode…" : "Search items…"}
          className="min-w-0 flex-1 rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink sm:max-w-xs sm:flex-none"
        />
        <button
          type="button"
          onClick={() => (canScan ? setScanOpen(true) : setScanLockedOpen((o) => !o))}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-sm font-semibold text-text hover:bg-paper"
        >
          {canScan ? "Scan barcode" : "Scan barcode 🔒"}
        </button>
        {scanLockedOpen && !canScan && (
          <p className="basis-full rounded-lg bg-brass/15 px-3 py-2 text-xs text-brass-dark">
            Barcode scanning is available on the Professional and Business plans. Upgrade to scan items with your phone camera or a barcode scanner.
          </p>
        )}
        {itemPerms.add && (
        <button
          type="button"
          onClick={() => openForm(null)}
          className="rounded-xl bg-ink px-3.5 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light"
        >
          + Add {labels.itemSingular.toLowerCase()}
        </button>
        )}
        {(itemPerms.edit || itemPerms.hide || itemPerms.remove) && (
        <button
          type="button"
          onClick={() => setManage((m) => !m)}
          className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition ${
            manage ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text hover:bg-paper"
          }`}
        >
          {manage ? "Done" : "Manage"}
        </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[null, ...categories].map((c) => (
            <button
              key={c ?? "__all"}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                category === c ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text-soft hover:bg-paper"
              }`}
            >
              {c ?? "All"}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-10 text-center text-sm text-text-soft">
          {products.length === 0 ? "No items yet. Add some under Products first." : "Nothing matches."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {visible.map((p) => {
            const qty = cart[p.id] ?? 0;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={p.is_active ? 0 : -1}
                aria-disabled={!p.is_active}
                onClick={() => !manage && add(p)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border border-paper-fold bg-white p-2 text-center shadow-card transition ${
                  manage ? "" : p.is_active ? "cursor-pointer active:scale-95 hover:border-ink/30" : "cursor-not-allowed opacity-60"
                }`}
              >
                {qty > 0 && (
                  <span className="absolute right-1 top-1 z-[1] flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink px-1 text-[0.65rem] font-bold text-paper">
                    {qty}
                  </span>
                )}
                <ProductThumb p={p} size={56} dim={!p.is_active} />
                <span className="line-clamp-2 w-full text-xs font-medium leading-tight text-text">{p.name}</span>
                <span className="font-ledger text-xs font-semibold tabular-nums text-ink">
                  {p.is_active ? money(Number(p.price), currency) : "Hidden"}
                </span>
                {manage && (
                  <div className="mt-1 flex w-full gap-1 [&>button]:flex-1">
                    {itemPerms.edit && <button type="button" onClick={() => openForm(p)} className="rounded border border-paper-fold py-1 text-[0.65rem] font-semibold text-text hover:bg-paper">
                      Edit
                    </button>}
                    {itemPerms.hide && <button type="button" disabled={busyId === p.id} onClick={() => toggleActive(p)} className="rounded border border-paper-fold py-1 text-[0.65rem] font-semibold text-text hover:bg-paper disabled:opacity-60">
                      {p.is_active ? "Hide" : "Show"}
                    </button>}
                    {itemPerms.remove && <button type="button" disabled={busyId === p.id} onClick={() => removeProduct(p)} className="rounded border border-alert/30 py-1 text-[0.65rem] font-semibold text-alert hover:bg-alert-bg disabled:opacity-60">
                      Del
                    </button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <ProductFormModal
          ownerId={ownerId}
          businessId={businessId}
          product={editing}
          itemLabel={labels.itemSingular}
          defaultUnit={labels.defaultUnit}
          unitOptions={labels.unitOptions}
          stockTrackingDefault={labels.stockTrackingDefault}
          stockHint={labels.stockHint}
          plan={plan}
          categories={categories}
          onClose={() => setFormOpen(false)}
        />
      )}
      {scanOpen && <BarcodeScannerModal onScan={addByCode} onClose={() => setScanOpen(false)} />}
      {limitOpen && productLimit !== null && (
        <LimitReachedModal kind="products" limit={productLimit} currentPlan={plan} onClose={() => setLimitOpen(false)} />
      )}
    </div>
  );
}
