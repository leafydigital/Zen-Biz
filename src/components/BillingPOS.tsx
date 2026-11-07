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
import { CategoryBar, inCategory } from "@/components/CategoryBar";
import { getPlanFeatures } from "@/lib/planFeatures";
import { BillingSettingsModal } from "@/components/BillingSettingsModal";
import { UpiQrModal } from "@/components/UpiQrModal";
import { isLow, type StockLimits } from "@/lib/stockLimits";
import {
  formatBillNo,
  maxRedeemable,
  phoneDigits,
  pointsEarned,
  type BillingCustomerLite,
  type BillingSettings,
} from "@/lib/billingLoyalty";

type PayMethod = "cash" | "upi" | "credit_card" | "split";

export interface RecentBill {
  id: string;
  createdAt: string;
  /** Bill number like B0007. */
  billNo: string;
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
  /** Points used on this bill (number) and the rupees taken off for them. */
  pointsUsed?: number;
  pointsDiscount?: number;
  pointsEarned?: number;
  pointsBalance?: number;
  /** Cash handed over / change returned, and the UPI part of a split payment. */
  cashGiven?: number;
  change?: number;
  upiPart?: number;
  cashPart?: number;
}
type PaperWidth = 58 | 80;
/** The three buttons that finish a bill. Each one waits until the payment is done. */
type ActionKind = "save" | "print" | "both";
/** A bill put on hold (customer will pay later). Kept on this device. */
interface HeldBill {
  id: string;
  cart: Record<string, number>;
  custName: string;
  custPhone: string;
  createdAt: string;
}
const MAX_HELD = 50;

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
  customers: initialCustomers,
  billingSettings: initialSettings,
  stockLimits,
  isOwner,
}: {
  ownerId: string;
  businessId: string;
  products: Product[];
  currency: string;
  business: { name: string; address: string | null; phone: string | null; gstin: string | null };
  recent: RecentBill[];
  canViewRecords: boolean;
  itemPerms: { add: boolean; edit: boolean; hide: boolean; remove: boolean };
  customers: BillingCustomerLite[];
  billingSettings: BillingSettings;
  stockLimits: StockLimits;
  isOwner: boolean;
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
  const [showPrev, setShowPrev] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [paper, setPaper] = useState<PaperWidth>(80);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savedNo, setSavedNo] = useState("");
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [manage, setManage] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanLockedOpen, setScanLockedOpen] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const [customers, setCustomers] = useState(initialCustomers);
  useEffect(() => setSettings(initialSettings), [initialSettings]);
  useEffect(() => setCustomers(initialCustomers), [initialCustomers]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [redeemOn, setRedeemOn] = useState(false);
  const [redeemPts, setRedeemPts] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [qrFor, setQrFor] = useState<{ kind: ActionKind } | null>(null);
  const [held, setHeld] = useState<HeldBill[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [heldLoaded, setHeldLoaded] = useState(false);
  const [stockPopup, setStockPopup] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category?.trim()).filter(Boolean) as string[])).sort(),
    [products]
  );

  const isOutOfStock = (p: Product) => p.is_active && p.stock_qty !== null && Number(p.stock_qty) <= 0;
  // Out-of-stock (grey) items are moved to the end. The sort is stable, so everything else keeps its order.
  const visible = products
    .filter((p) => inCategory(p, category) && p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => Number(isOutOfStock(a)) - Number(isOutOfStock(b)));

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

  // ---- stock watch (owner popup)
  const outItems = useMemo(() => products.filter((p) => p.is_active && p.stock_qty !== null && Number(p.stock_qty) <= 0), [products]);
  const lowItems = useMemo(
    () => products.filter((p) => p.is_active && isLow(stockLimits, p.stock_qty === null ? null : Number(p.stock_qty), p.unit)),
    [products, stockLimits]
  );
  const outSig = outItems.map((p) => p.id).sort().join(",");
  useEffect(() => {
    if (!isOwner || !outSig) return;
    try {
      if (sessionStorage.getItem("zb-outpopup-" + businessId) === outSig) return;
    } catch {
      /* storage blocked: just show it */
    }
    setStockPopup(true);
  }, [isOwner, outSig, businessId]);
  function closeStockPopup() {
    setStockPopup(false);
    try {
      sessionStorage.setItem("zb-outpopup-" + businessId, outSig);
    } catch {
      /* ignore */
    }
  }

  // ---- billing customer, points and payment
  const phoneKey = phoneDigits(custPhone);
  const hasCustomer = phoneKey.length >= 6;
  const matched = hasCustomer ? customers.find((c) => c.phone === phoneKey) ?? null : null;
  const suggestions =
    phoneFocus && phoneKey.length >= 1 ? customers.filter((c) => c.phone.includes(phoneKey)).slice(0, 6) : [];
  const maxPts = matched ? maxRedeemable(settings, matched.points, totals.total) : 0;
  const ptsUsed = redeemOn ? Math.min(maxPts, Math.max(0, Math.floor(Number(redeemPts) || 0))) : 0;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const pointsDiscount = r2(ptsUsed * settings.pointValue);
  const payable = Math.max(0, r2(totals.total - pointsDiscount));
  const earned = hasCustomer ? pointsEarned(settings, payable) : 0;
  const cashGivenN = Number(cashGiven) || 0;
  const splitCashN = Math.min(payable, Math.max(0, Number(splitCash) || 0));
  const splitUpiN = r2(payable - splitCashN);
  const upiAmount = payMethod === "upi" ? payable : payMethod === "split" ? splitUpiN : 0;
  const cashPart = payMethod === "cash" ? payable : payMethod === "split" ? splitCashN : 0;

  // A different customer, or an emptied bill, ends any point redemption.
  useEffect(() => {
    setRedeemOn(false);
    setRedeemPts("");
  }, [matched?.id]);
  useEffect(() => {
    if (cartLines.length === 0) setRedeemOn(false);
  }, [cartLines.length]);

  function add(p: Product) {
    if (!p.is_active) return;
    const stock = p.stock_qty === null ? null : Number(p.stock_qty);
    if (stock !== null && (cart[p.id] ?? 0) + 1 > stock) {
      setError(
        stock <= 0
          ? p.name + " is out of stock, so it can't be added to a bill."
          : "Only " + stock + " " + p.unit + " of " + p.name + " in stock."
      );
      if (stock <= 0 && isOwner) setStockPopup(true);
      return;
    }
    setError(null);
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
    const st = p.stock_qty === null ? null : Number(p.stock_qty);
    if (st !== null && (cart[p.id] ?? 0) + 1 > st) return st <= 0 ? `${p.name} is out of stock` : `Only ${st} ${p.unit} of ${p.name} in stock`;
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

  function resetBillExtras() {
    setCashGiven("");
    setSplitCash("");
    setRedeemOn(false);
    setRedeemPts("");
  }

  function clearCart() {
    setCart({});
    setCustName("");
    setCustPhone("");
    setError(null);
    resetBillExtras();
  }

  function pickCustomer(c: BillingCustomerLite) {
    setCustPhone(c.phone);
    setCustName(c.name);
    setPhoneFocus(false);
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
<div>${now.toLocaleDateString("en-IN")} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
${billRef ? `<div><b>Bill No: ${escapeHtml(billRef)}</b></div>` : ""}
<hr>
<table>${rows}</table>
<hr>
<table>
<tr><td>Subtotal</td><td class="r">${d.subtotal.toFixed(2)}</td></tr>
${d.tax > 0 ? `<tr><td>Tax</td><td class="r">${d.tax.toFixed(2)}</td></tr>` : ""}
${Math.abs(d.roundOff) > 0.004 ? `<tr><td>Round off</td><td class="r">${d.roundOff.toFixed(2)}</td></tr>` : ""}
${d.pointsUsed ? `<tr><td>Points used (${d.pointsUsed})</td><td class="r">-${(d.pointsDiscount ?? 0).toFixed(2)}</td></tr>` : ""}
<tr class="t"><td>TOTAL</td><td class="r">${money(d.total, currency)}</td></tr>
</table>
<hr>
${d.customerName ? `<div>Customer: ${escapeHtml(d.customerName)}</div>` : ""}
${d.customerPhone ? `<div>Phone: ${escapeHtml(d.customerPhone)}</div>` : ""}
<div>Paid by: ${d.payMethod === "credit_card" ? "CARD" : d.payMethod === "split" ? "CASH + UPI" : d.payMethod.toUpperCase()}</div>
${d.payMethod === "split" ? `<div>Cash: ${(d.cashPart ?? 0).toFixed(2)} &nbsp; UPI: ${(d.upiPart ?? 0).toFixed(2)}</div>` : ""}
${(d.payMethod === "cash" || d.payMethod === "split") && d.cashGiven ? `<div>Cash given: ${d.cashGiven.toFixed(2)} &nbsp; Change: ${(d.change ?? 0).toFixed(2)}</div>` : ""}
${d.pointsEarned ? `<div>Points earned: ${d.pointsEarned}</div>` : ""}
${d.pointsBalance !== undefined ? `<div>Points balance: ${d.pointsBalance}</div>` : ""}
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

  /** withLoyalty = a saved bill: points, change and split amounts are included. "Print only" shows the plain bill. */
  function cartReceipt(ref: string | null, withLoyalty: boolean, balanceAfter?: number): ReceiptData {
    return {
      ref,
      date: new Date(),
      rows: totals.rows.map((r) => ({ name: r.product.name, qty: r.qty, price: Number(r.product.price), amount: r.result.taxableAmount })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      roundOff: totals.roundOff,
      total: withLoyalty ? payable : totals.total,
      payMethod,
      customerName: custName.trim() || undefined,
      customerPhone: custPhone.trim() || undefined,
      ...(withLoyalty
        ? {
            pointsUsed: ptsUsed > 0 ? ptsUsed : undefined,
            pointsDiscount: ptsUsed > 0 ? pointsDiscount : undefined,
            pointsEarned: earned > 0 ? earned : undefined,
            pointsBalance: balanceAfter,
          }
        : {}),
      cashGiven: cashPart > 0 && cashGivenN > 0 ? cashGivenN : undefined,
      change: cashPart > 0 && cashGivenN > 0 ? r2(cashGivenN - cashPart) : undefined,
      cashPart: payMethod === "split" ? splitCashN : undefined,
      upiPart: payMethod === "split" ? splitUpiN : undefined,
    };
  }

  function reprint(b: RecentBill) {
    printReceipt({ ref: b.billNo || b.id.slice(0, 6).toUpperCase(), date: new Date(b.createdAt), rows: b.items, subtotal: b.subtotal, tax: b.tax, roundOff: b.roundOff, total: b.total, payMethod: b.payMethod });
  }

  function newBill() {
    setCart({});
    setCustName("");
    setCustPhone("");
    setError(null);
    setSavedId(null);
    setSearch("");
    resetBillExtras();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Finds or creates the billing customer for the typed phone. Null when no phone was typed (walk-in). */
  async function ensureCustomer(): Promise<BillingCustomerLite | null> {
    if (!hasCustomer) return null;
    if (matched) return matched;
    const created: BillingCustomerLite = { id: crypto.randomUUID(), name: custName.trim(), phone: phoneKey, points: 0 };
    const { error: cErr } = await supabase
      .from("billing_customers" as never)
      .insert({ id: created.id, owner_id: ownerId, business_id: businessId, name: created.name, phone: created.phone } as never);
    if (cErr) {
      // Saved earlier from another device: use that one.
      const { data } = (await supabase
        .from("billing_customers" as never)
        .select("id, name, phone, points")
        .eq("business_id", businessId)
        .eq("phone", phoneKey)
        .maybeSingle()) as { data: { id: string; name: string; phone: string; points: number } | null };
      if (data) return { id: data.id, name: data.name, phone: data.phone, points: Number(data.points) };
      throw new Error(
        /billing_customers/.test(cErr.message)
          ? "Billing customers are not set up yet. Run supabase/migration_54.sql in the Supabase SQL editor."
          : cErr.message
      );
    }
    return created;
  }

  async function save(): Promise<{ id: string; billNo: string; balanceAfter?: number } | null> {
    setSaving(true);
    setError(null);
    const today = new Date().toISOString().slice(0, 10);

    let cust: BillingCustomerLite | null = null;
    try {
      cust = await ensureCustomer();
    } catch (e) {
      setSaving(false);
      setError((e as Error).message || "Could not save the customer.");
      return null;
    }

    // The id is made here (not returned by the server) so a bill can be saved offline and synced later.
    const invoiceId = crypto.randomUUID();
    const payNote =
      payMethod === "split"
        ? `Paid: Cash ${splitCashN.toFixed(2)} + UPI ${splitUpiN.toFixed(2)}${cashGivenN > 0 && splitCashN > 0 ? `, cash given ${cashGivenN.toFixed(2)}, change ${r2(cashGivenN - splitCashN).toFixed(2)}` : ""}`
        : payMethod === "cash" && cashGivenN > 0
          ? `Cash given ${cashGivenN.toFixed(2)}, change ${r2(cashGivenN - payable).toFixed(2)}`
          : "";
    const { error: invErr } = await supabase
      .from("invoices" as never)
      .insert({
        id: invoiceId,
        owner_id: ownerId,
        business_id: businessId,
        customer_id: null,
        // Billing records carry a throwaway number; the column is NOT NULL.
        invoice_number: `DRAFT-${crypto.randomUUID().slice(0, 8)}`,
        record_type: "billing_record",
        invoice_date: today,
        due_date: null,
        status: "paid",
        payment_method: payMethod === "split" ? "other" : payMethod,
        amount_paid: payable,
        currency,
        tax_type: taxType,
        subtotal: totals.subtotal,
        gst_enabled: anyTax,
        gst_percent: anyTax ? Number(totals.rows[0]?.product.tax_percent) || 0 : 0,
        gst_amount: totals.tax,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        // Includes the rupees taken off for redeemed points, so subtotal + tax + round off = total.
        round_off: r2(payable - totals.subtotal - totals.tax),
        total: payable,
        ...(cust ? { billing_customer_id: cust.id, points_earned: earned, points_redeemed: ptsUsed } : {}),
        notes: [
          "Created from POS",
          custName.trim() && `Customer: ${custName.trim()}`,
          custPhone.trim() && `Phone: ${custPhone.trim()}`,
          ptsUsed > 0 && `Points redeemed: ${ptsUsed} (-${pointsDiscount.toFixed(2)})`,
          earned > 0 && `Points earned: ${earned}`,
          payNote,
        ]
          .filter(Boolean)
          .join("\n"),
      } as never);

    if (invErr) {
      setSaving(false);
      setError(
        /billing_customer_id|points_earned|points_redeemed/.test(invErr.message)
          ? "Billing customer columns are missing. Run supabase/migration_54.sql in the Supabase SQL editor."
          : invErr.message || "Could not save the bill."
      );
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
    if (itemsErr) {
      setSaving(false);
      setError(itemsErr.message);
      return null;
    }

    let balanceAfter: number | undefined;
    if (cust) {
      balanceAfter = Math.max(0, r2(cust.points - ptsUsed + earned));
      // One atomic update in the database: total spent, visits, points.
      const { error: applyErr } = await supabase.rpc(
        "billing_customer_apply" as never,
        { p_id: cust.id, p_name: custName.trim(), p_spent: payable, p_points: r2(earned - ptsUsed) } as never
      );
      if (applyErr) setError("Bill saved, but the customer's points could not be updated: " + applyErr.message);
      const updated: BillingCustomerLite = { ...cust, name: custName.trim() || cust.name, points: balanceAfter };
      setCustomers((list) => (list.some((c) => c.id === updated.id) ? list.map((c) => (c.id === updated.id ? updated : c)) : [updated, ...list]));
    }
    // The database numbers the bill (B0001, B0002 ...). If that is not possible right now (offline), a short id is used.
    let billNo = "";
    try {
      const { data: nrow } = (await supabase
        .from("invoices" as never)
        .select("bill_no")
        .eq("id", invoiceId)
        .maybeSingle()) as { data: { bill_no: number | null } | null };
      billNo = formatBillNo(nrow?.bill_no, invoiceId);
    } catch {
      billNo = formatBillNo(null, invoiceId);
    }
    setSaving(false);
    return { id: invoiceId, billNo, balanceAfter };
  }

  async function finish(alsoPrint: boolean) {
    const res = await save();
    if (!res) return;
    if (alsoPrint) printReceipt(cartReceipt(res.billNo, true, res.balanceAfter));
    setSavedId(res.id);
    setSavedNo(res.billNo);
    setCart({});
    setCustName("");
    setCustPhone("");
    resetBillExtras();
    router.refresh();
  }

  /** Checks the payment, shows the UPI QR when needed, and only then saves / prints. */
  function handleAction(kind: ActionKind) {
    if (cartLines.length === 0) return;
    setError(null);
    if (kind === "print" && ptsUsed > 0) {
      setError("Points are only taken off when the bill is saved. Remove the points, or use Save & print.");
      return;
    }
    // Print only on plain Cash may be used with the cash box empty (just a bill to look at). Everything else needs the amount.
    const blankOk = kind === "print" && payMethod === "cash";
    if (cashPart > 0 && cashGivenN <= 0 && !blankOk) {
      setError(payMethod === "split" ? "Type the cash amount given, or tap Exact." : "Type the amount the customer gave, or tap Exact.");
      return;
    }
    if (cashPart > 0 && cashGivenN > 0 && cashGivenN + 0.004 < cashPart) {
      setError(payMethod === "split" ? "Cash given is less than the cash amount." : "Cash given is less than the bill amount.");
      return;
    }
    if (upiAmount > 0) {
      if (!settings.upiId) {
        setError("Add your UPI ID in Billing settings (gear icon) to show the payment QR code.");
        return;
      }
      setQrFor({ kind });
      return;
    }
    void complete(kind);
  }

  async function complete(kind: ActionKind) {
    if (kind === "print") {
      printReceipt(cartReceipt(null, false));
      return;
    }
    await finish(kind === "both");
  }

  // ---- bills on hold (customer pays later)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("zb-held-" + businessId);
      if (raw) setHeld(JSON.parse(raw) as HeldBill[]);
    } catch {
      /* ignore unreadable storage */
    }
    setHeldLoaded(true);
  }, [businessId]);
  useEffect(() => {
    if (!heldLoaded) return;
    try {
      localStorage.setItem("zb-held-" + businessId, JSON.stringify(held));
    } catch {
      /* storage full or blocked */
    }
  }, [held, heldLoaded, businessId]);

  function heldTotal(c: Record<string, number>) {
    const lines = products.filter((x) => x.is_active && (c[x.id] ?? 0) > 0);
    const tt: TaxType = lines.some((x) => Number(x.tax_percent) > 0) ? "tax" : "non_tax";
    let sum = 0;
    for (const x of lines) {
      const r = calculateGstLine(
        { quantity: c[x.id], unitPrice: Number(x.price), discountPercent: 0, taxPercent: Number(x.tax_percent) || 0 },
        tt
      );
      sum += r.taxableAmount + r.taxAmount;
    }
    return { count: lines.reduce((n, x) => n + c[x.id], 0), total: calculateRoundOff(sum).rounded };
  }

  function snapshotBill(): HeldBill {
    return { id: crypto.randomUUID(), cart: { ...cart }, custName, custPhone, createdAt: new Date().toISOString() };
  }

  /** Puts the current bill aside so the next customer can be served. */
  function holdCurrent() {
    if (cartLines.length === 0) return;
    if (held.length >= MAX_HELD) {
      setError("You have " + MAX_HELD + " bills on hold. Finish or delete one first.");
      return;
    }
    setHeld((h) => [snapshotBill(), ...h]);
    setCart({});
    setCustName("");
    setCustPhone("");
    setError(null);
    setSavedId(null);
    resetBillExtras();
    setShowHeld(true);
  }

  function resumeHeld(h: HeldBill) {
    const usable: Record<string, number> = {};
    for (const [id, q] of Object.entries(h.cart)) {
      const prod = products.find((x) => x.id === id && x.is_active);
      if (!prod) continue;
      const st = prod.stock_qty === null ? null : Number(prod.stock_qty);
      const q2 = st === null ? q : Math.min(q, Math.floor(st));
      if (q2 > 0) usable[id] = q2;
    }
    if (Object.keys(usable).length === 0) {
      setError("The items on that bill are no longer available.");
      return;
    }
    // A bill already open is put on hold first, so nothing is lost.
    setHeld((list) => [...(cartLines.length > 0 ? [snapshotBill()] : []), ...list.filter((x) => x.id !== h.id)]);
    setCart(usable);
    setCustName(h.custName);
    setCustPhone(h.custPhone);
    setSavedId(null);
    setError(null);
    resetBillExtras();
    setShowHeld(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteHeld(h: HeldBill) {
    if (!window.confirm("Delete this bill on hold?")) return;
    setHeld((list) => list.filter((x) => x.id !== h.id));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar: customer, phone, previous bills, new bill */}
      <div className="flex flex-col gap-2 rounded-xl2 border border-paper-fold bg-paper-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-[13rem]">
            <input
              value={custPhone}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d+ -]/g, "");
                setCustPhone(v);
                const m = customers.find((c) => c.phone === phoneDigits(v));
                if (m) setCustName(m.name);
              }}
              onFocus={() => setPhoneFocus(true)}
              onBlur={() => setTimeout(() => setPhoneFocus(false), 150)}
              inputMode="tel"
              autoComplete="off"
              placeholder="Phone (optional)"
              className="w-full rounded-lg border border-paper-fold bg-white px-3 py-2 text-sm text-text placeholder:text-text-soft/60"
            />
            {suggestions.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-paper-fold bg-white shadow-card">
                {suggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickCustomer(c);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-paper"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-text">{c.name || "No name"}</span>
                        <span className="block text-xs text-text-soft">{c.phone}</span>
                      </span>
                      {settings.loyaltyOn && (
                        <span className="shrink-0 rounded-full bg-brass/15 px-2 py-0.5 text-xs font-semibold text-brass-dark">{c.points} pts</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            placeholder="Customer name (optional)"
            className="min-w-0 flex-1 rounded-lg border border-paper-fold bg-white px-3 py-2 text-sm text-text placeholder:text-text-soft/60 sm:max-w-[14rem]"
          />
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Billing settings"
              title="Billing settings: credit points and UPI"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-paper-fold bg-white text-text hover:bg-paper"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowHeld((v) => !v)}
              aria-expanded={showHeld}
              className="min-w-0 flex-1 whitespace-nowrap rounded-lg border border-paper-fold bg-white px-3 py-2 text-sm font-semibold text-text hover:bg-paper sm:flex-none"
            >
              Pay later{held.length > 0 ? ` (${held.length})` : ""} {showHeld ? "▴" : "▾"}
            </button>
            <button
              type="button"
              onClick={() => setShowPrev((v) => !v)}
              aria-expanded={showPrev}
              className="min-w-0 flex-1 whitespace-nowrap rounded-lg border border-paper-fold bg-white px-3 py-2 text-sm font-semibold text-text hover:bg-paper sm:flex-none"
            >
              Previous bills{recent.length > 0 ? ` (${recent.length})` : ""} {showPrev ? "▴" : "▾"}
            </button>
            <button
              type="button"
              onClick={newBill}
              className="min-w-0 flex-1 whitespace-nowrap rounded-lg bg-ink px-3 py-2 text-sm font-semibold text-paper hover:bg-ink-light sm:flex-none"
            >
              + New bill
            </button>
          </div>
        </div>
        {showHeld &&
          (held.length === 0 ? (
            <p className="border-t border-paper-fold pt-2 text-xs text-text-soft">
              No bills on hold. Tap <span className="font-semibold">Hold</span> on a bill when the customer will pay later, then serve the next customer.
            </p>
          ) : (
            <div className="grid gap-2 border-t border-paper-fold pt-2 sm:grid-cols-2">
              {held.map((h) => {
                const t = heldTotal(h.cart);
                return (
                  <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{h.custName || h.custPhone || "Walk-in customer"}</p>
                      <p className="truncate text-xs text-text-soft">
                        {t.count} item(s) · {money(t.total, currency)} ·{" "}
                        {new Date(h.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button type="button" onClick={() => resumeHeld(h)} className="rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-paper hover:bg-ink-light">
                        Pay now
                      </button>
                      <button type="button" onClick={() => deleteHeld(h)} aria-label="Delete held bill" className="rounded-lg border border-paper-fold bg-white px-2 py-1 text-xs font-semibold text-alert hover:bg-paper">
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        {showPrev &&
          (recent.length === 0 ? (
            <p className="text-xs text-text-soft">No bills yet.</p>
          ) : (
            <div className="grid gap-2 border-t border-paper-fold pt-2 sm:grid-cols-2">
              {recent.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border border-paper-fold bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="font-ledger text-sm font-semibold tabular-nums text-text">
                      {b.billNo && <span className="mr-2 rounded-md bg-ink/10 px-1.5 py-0.5 text-xs text-ink">{b.billNo}</span>}
                      {money(b.total, currency)}
                    </p>
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
          ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_22rem] md:items-start">
        <div className="flex min-w-0 flex-col gap-4">
      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {savedId && (
        <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success">
          Bill saved{savedNo ? <> · <span className="font-semibold">Bill No {savedNo}</span></> : null}.{" "}
          {canViewRecords && (
            <Link href={`/dashboard/billing-records/${savedId}`} className="font-semibold underline">
              View record
            </Link>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 basis-full sm:basis-auto sm:max-w-xs sm:flex-none">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchEnter}
            placeholder={canScan ? "Search items or scan barcode…" : "Search items…"}
            aria-label="Search items"
            type="search"
            className="w-full rounded-xl border border-paper-fold bg-white py-2.5 pl-3.5 pr-9 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search" title="Clear search"
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-text-soft hover:bg-paper-fold hover:text-text"
            >
              ×
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => (canScan ? setScanOpen(true) : setScanLockedOpen((o) => !o))}
          className="whitespace-nowrap rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-sm font-semibold text-text hover:bg-paper"
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
        <button
          type="button"
          onClick={() => setAlertsOpen(true)}
          aria-label={"Stock alerts: " + (outItems.length + lowItems.length) + " items"}
          className="relative inline-flex items-center gap-2 rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-sm font-semibold text-text hover:bg-paper"
        >
          Stock alerts
          {outItems.length + lowItems.length > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-alert px-1.5 text-[0.7rem] font-bold text-white">
              {outItems.length + lowItems.length}
            </span>
          )}
        </button>
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

      <CategoryBar items={products} value={category} onChange={setCategory} />

      {visible.length === 0 ? (
        <p className="rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-10 text-center text-sm text-text-soft">
          {products.length === 0 ? "No items yet. Add some under Products first." : "Nothing matches."}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {visible.map((p) => {
            const qty = cart[p.id] ?? 0;
            const stock = p.stock_qty === null ? null : Number(p.stock_qty);
            const left = stock === null ? null : Math.round((stock - qty) * 1000) / 1000;
            const out = left !== null && left <= 0;
            const low = left !== null && !out && isLow(stockLimits, left, p.unit);
            const tone = out ? "border-gray-300 bg-gray-100 grayscale" : low ? "border-amber-300 bg-amber-50" : "border-paper-fold bg-white";
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={p.is_active ? 0 : -1}
                aria-disabled={!p.is_active || out}
                onClick={() => !manage && add(p)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl border ${tone} p-2 text-center shadow-card transition ${
                  manage
                    ? ""
                    : !p.is_active
                      ? "cursor-not-allowed opacity-60"
                      : out
                        ? "cursor-not-allowed"
                        : "cursor-pointer active:scale-95 hover:border-ink/30"
                }`}
              >
                {qty > 0 && (
                  <span className="absolute right-1 top-1 z-[1] flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-ink px-1 text-[0.65rem] font-bold text-paper">
                    {qty}
                  </span>
                )}
                <ProductThumb p={p} size={56} dim={!p.is_active || out} />
                <span className="line-clamp-2 w-full text-xs font-medium leading-tight text-text">{p.name}</span>
                <span className="font-ledger text-xs font-semibold tabular-nums text-ink">
                  {p.is_active ? money(Number(p.price), currency) : "Hidden"}
                </span>
                {p.is_active && left !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${
                      out ? "bg-gray-800 text-white" : low ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
                    }`}
                  >
                    {out ? (stock !== null && stock <= 0 ? "Out of stock" : "All " + stock + " in bill") : left + " " + p.unit + " left" + (low ? " · low" : "")}
                  </span>
                )}
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
        </div>
        {/* Bill panel: stays frozen on the right while you scroll items; only the list of selected items scrolls inside it. */}
        <aside className={`flex min-h-0 flex-col gap-3 rounded-xl2 border border-paper-fold bg-paper-card p-4 shadow-card max-md:sticky max-md:bottom-0 max-md:z-20 max-md:max-h-[72dvh] max-md:rounded-b-none max-md:p-3 max-md:shadow-[0_-8px_20px_rgba(0,0,0,0.14)] md:sticky md:top-2 md:max-h-[calc(100vh-1rem)] ${cartLines.length === 0 ? "max-md:hidden" : ""}`}>
          {/* Total stays pinned at the top of the bill; items + payment scroll; buttons stay pinned at the bottom. */}
          <div className="shrink-0 text-right">
            <p className="text-[0.7rem] uppercase tracking-wide text-text-soft">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
            {pointsDiscount > 0 && (
              <p className="font-ledger text-xs tabular-nums text-text-soft line-through">{money(totals.total, currency)}</p>
            )}
            <p className="font-ledger text-2xl font-bold tabular-nums text-ink">{money(payable, currency)}</p>
            {settings.loyaltyOn && matched && (
              <p className="mt-0.5 text-xs font-semibold text-brass-dark">
                {matched.points} pts available (worth {money(r2(matched.points * settings.pointValue), currency)})
              </p>
            )}
            {pointsDiscount > 0 && <p className="text-xs text-text-soft">Points used −{money(pointsDiscount, currency)}</p>}
            {earned > 0 && <p className="text-xs font-semibold text-success">+{earned} pts on this bill</p>}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-0.5">
          {cartLines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-paper-fold py-6 text-center text-sm text-text-soft">Tap an item to start a bill.</p>
          ) : (
            <ul className="divide-y divide-paper-fold">
              {cartLines.map(({ product, qty }) => {
                const row = totals.rows.find((r) => r.product.id === product.id);
                const line = row ? row.result.taxableAmount + row.result.taxAmount : Number(product.price) * qty;
                return (
                  <li key={product.id} className="flex items-center gap-2 py-2">
                    <ProductThumb p={product} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{product.name}</p>
                      <p className="text-xs text-text-soft">{money(Number(product.price), currency)} each</p>
                      <p className="font-ledger text-xs font-semibold tabular-nums text-ink">{money(line, currency)}</p>
                    </div>
                    <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-paper-fold bg-white">
                      <button type="button" onClick={() => remove(product)} aria-label={`Remove one ${product.name}`} className="h-8 w-7 text-base font-bold text-text hover:bg-paper">
                        −
                      </button>
                      <span className="min-w-[1.5rem] text-center text-sm font-semibold tabular-nums text-text">{qty}</span>
                      <button type="button" onClick={() => add(product)} aria-label={`Add one ${product.name}`} className="h-8 w-7 text-base font-bold text-text hover:bg-paper">
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {cartLines.length > 0 && (
            <>
              {settings.loyaltyOn && matched && maxPts > 0 && (
                <div className="rounded-lg border border-paper-fold bg-white p-2.5 text-xs">
                  {!redeemOn ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRedeemOn(true);
                        setRedeemPts(String(maxPts));
                      }}
                      className="w-full rounded-lg bg-brass/15 px-3 py-2 font-semibold text-brass-dark hover:bg-brass/25"
                    >
                      Redeem points (up to {maxPts} = {money(r2(maxPts * settings.pointValue), currency)})
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-text">Use</span>
                      <input
                        type="number"
                        min={0}
                        max={maxPts}
                        step={1}
                        value={redeemPts}
                        onChange={(e) => setRedeemPts(e.target.value)}
                        className="w-20 rounded-lg border border-paper-fold bg-white px-2 py-1 text-sm text-text"
                        aria-label="Points to use"
                      />
                      <span className="text-text-soft">pts = −{money(pointsDiscount, currency)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRedeemOn(false);
                          setRedeemPts("");
                        }}
                        className="ml-auto font-semibold text-alert"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-4 gap-1 rounded-lg bg-paper p-1 text-[0.7rem] font-semibold" role="radiogroup" aria-label="Payment method">
                  {(
                    [
                      ["cash", "Cash"],
                      ["upi", "UPI"],
                      ["credit_card", "Card"],
                      ["split", "Cash+UPI"],
                    ] as [PayMethod, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={payMethod === id}
                      onClick={() => {
                        setPayMethod(id);
                        setCashGiven("");
                        setSplitCash("");
                      }}
                      className={`rounded-md px-1 py-1.5 transition ${payMethod === id ? "bg-ink text-paper" : "text-text-soft hover:bg-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {payMethod === "split" && (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-paper-fold bg-white p-2.5 text-xs text-text-soft">
                    <label className="flex items-center gap-2">
                      <span className="w-12 shrink-0">Cash</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                        placeholder="0.00"
                        className="min-w-0 flex-1 rounded-lg border border-paper-fold bg-white px-2 py-1.5 text-right text-sm text-text"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="w-12 shrink-0">UPI</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={splitUpiN === 0 && splitCash === "" ? "" : String(splitUpiN)}
                        onChange={(e) => setSplitCash(String(r2(payable - Math.min(payable, Math.max(0, Number(e.target.value) || 0)))))}
                        placeholder={payable.toFixed(2)}
                        className="min-w-0 flex-1 rounded-lg border border-paper-fold bg-white px-2 py-1.5 text-right text-sm text-text"
                      />
                    </label>
                    <p className="text-[0.7rem]">The two amounts always add up to the bill. The UPI QR shows only the UPI amount.</p>
                  </div>
                )}

                {(payMethod === "cash" || (payMethod === "split" && splitCashN > 0)) && (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-paper-fold bg-white p-2.5">
                    <label className="flex items-center gap-2 text-xs text-text-soft">
                      <span className="shrink-0">{payMethod === "split" ? "Cash given" : "Customer gave"}</span>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        inputMode="decimal"
                        value={cashGiven}
                        onChange={(e) => setCashGiven(e.target.value)}
                        placeholder={cashPart.toFixed(2)}
                        className="min-w-0 flex-1 rounded-lg border border-paper-fold bg-white px-2 py-1.5 text-right text-sm text-text"
                      />
                      <button type="button" onClick={() => setCashGiven(String(cashPart))} className="shrink-0 rounded-lg border border-paper-fold px-2 py-1.5 font-semibold text-text hover:bg-paper">
                        Exact
                      </button>
                    </label>
                    {cashGivenN > 0 &&
                      (cashGivenN + 0.004 >= cashPart ? (
                        <p className="flex justify-between text-sm font-semibold text-success">
                          <span>Return to customer</span>
                          <span className="font-ledger tabular-nums">{money(r2(cashGivenN - cashPart), currency)}</span>
                        </p>
                      ) : (
                        <p className="flex justify-between text-sm font-semibold text-alert">
                          <span>Still to pay</span>
                          <span className="font-ledger tabular-nums">{money(r2(cashPart - cashGivenN), currency)}</span>
                        </p>
                      ))}
                  </div>
                )}

                {payMethod === "upi" && (
                  <p className="rounded-lg border border-paper-fold bg-white p-2.5 text-xs text-text-soft">
                    A QR code with {money(payable, currency)} is shown when you tap Save.
                  </p>
                )}
              </div>

            </>
          )}
          </div>
          {cartLines.length > 0 && (
              <div className="flex shrink-0 flex-col gap-2 border-t border-paper-fold pt-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={paper}
                  onChange={(e) => setPaper(Number(e.target.value) as PaperWidth)}
                  className="min-w-0 flex-1 rounded-lg border border-paper-fold bg-white px-2 py-1.5 text-xs text-text"
                  aria-label="Thermal paper width"
                >
                  <option value={80}>80mm paper</option>
                  <option value={58}>58mm paper</option>
                </select>
                <button
                  type="button"
                  onClick={holdCurrent}
                  title="Customer will pay later: put this bill aside and serve the next customer"
                  className="rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-xs font-semibold text-text hover:bg-paper"
                >
                  Hold
                </button>
                <button type="button" onClick={clearCart} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-alert">
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleAction("print")}
                  className="rounded-lg border border-paper-fold bg-white px-3 py-2 text-xs font-semibold text-text hover:bg-paper disabled:opacity-60"
                >
                  Print only
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleAction("save")}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save record"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleAction("both")}
                  className="col-span-2 rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-60"
                >
                  Save &amp; print
                </button>
              </div>
              </div>
          )}
        </aside>
      </div>

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
      {scanOpen && (
        <BarcodeScannerModal
          onScan={addByCode}
          onClose={() => setScanOpen(false)}
          lines={totals.rows.map((r) => ({ id: r.product.id, name: r.product.name, qty: r.qty, amount: money(r.result.taxableAmount + r.result.taxAmount, currency) }))}
          total={money(totals.total, currency)}
          count={itemCount}
          onInc={(id) => { const p = products.find((x) => x.id === id); if (p) add(p); }}
          onDec={(id) => { const p = products.find((x) => x.id === id); if (p) remove(p); }}
        />
      )}
      {stockPopup && isOwner && <StockOutPopup out={outItems} low={lowItems} onClose={closeStockPopup} />}
      {alertsOpen && <StockOutPopup out={outItems} low={lowItems} onClose={() => setAlertsOpen(false)} title="Stock alerts" />}
      {settingsOpen && (
        <BillingSettingsModal
          businessId={businessId}
          settings={settings}
          currency={currency}
          onClose={() => setSettingsOpen(false)}
          onSaved={(next) => {
            setSettings(next);
            router.refresh();
          }}
        />
      )}
      {qrFor && (
        <UpiQrModal
          vpa={settings.upiId}
          shopName={business.name}
          amount={upiAmount}
          amountLabel={money(upiAmount, currency)}
          note={business.name ? "Bill " + business.name : undefined}
          confirmLabel={
            qrFor.kind === "both" ? "Payment received · Save & print" : qrFor.kind === "print" ? "Payment received · Print" : "Payment received · Save"
          }
          onClose={() => setQrFor(null)}
          onConfirm={() => {
            const kind = qrFor.kind;
            setQrFor(null);
            void complete(kind);
          }}
        />
      )}
      {limitOpen && productLimit !== null && (
        <LimitReachedModal kind="products" limit={productLimit} currentPlan={plan} onClose={() => setLimitOpen(false)} />
      )}
    </div>
  );
}

/** Shown to the owner when items are out of stock: refill or order new stock. */
function StockOutPopup({ out, low, onClose, title }: { out: Product[]; low: Product[]; onClose: () => void; title?: string }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/50 sm:items-center" onClick={onClose} role="dialog" aria-modal="true" aria-label="Stock alert">
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-[440px] flex-col gap-3 overflow-y-auto rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-alert">
          <span aria-hidden="true">⚠️</span> {title ?? (out.length > 0 ? "Out of stock" : "Stock running low")}
        </h2>
        {out.length === 0 && low.length === 0 && <p className="text-sm text-text-soft">All items have enough stock.</p>}
        {out.length > 0 && (
          <>
            <p className="text-sm font-semibold text-alert">Out of stock ({out.length})</p>
            <p className="-mt-2 text-xs text-text-soft">These items can't be billed until you add stock.</p>
            <ul className="flex flex-col gap-1.5">
              {out.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-alert-bg px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-text">{p.name}</span>
                  <span className="ml-3 shrink-0 font-semibold text-alert">0 {p.unit}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {low.length > 0 && (
          <>
            <p className="mt-1 text-sm font-semibold text-amber-800">Running low ({low.length})</p>
            <ul className="flex flex-col gap-1.5">
              {low.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate text-text">{p.name}</span>
                  <span className="ml-3 shrink-0 font-semibold text-amber-800">
                    {p.stock_qty} {p.unit} left
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <Link href="/dashboard/stock" className="mt-1 rounded-xl bg-ink px-3 py-2.5 text-center text-sm font-semibold text-paper hover:bg-ink-light">
          Update stock
        </Link>
        <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-semibold text-text-soft hover:bg-paper">
          Close
        </button>
      </div>
    </div>
  );
}
