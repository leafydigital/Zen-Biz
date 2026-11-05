"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import { generateUniqueBarcode, printLabelItems, type BarcodeSettings } from "@/lib/barcode";
import { CategoryBar, inCategory } from "@/components/CategoryBar";
import type { Product } from "@/types/database";

type Filter = "all" | "low" | "out" | "untracked";
const LOW_STOCK = 5;
const inputCls = "w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink";
const money = (n: number) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;

export function StockManager({
  businessId,
  businessName,
  products,
  itemLabelPlural,
  barcodeSettings,
}: {
  businessId: string;
  businessName: string;
  products: Product[];
  itemLabelPlural: string;
  barcodeSettings: BarcodeSettings;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [category, setCategory] = useState<string | null>(null);
  const [target, setTarget] = useState<Product | null>(null);
  const [labelFor, setLabelFor] = useState<Product | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const rows = products.filter((p) => {
    if (!inCategory(p, category)) return false;
    if (q && !p.name.toLowerCase().includes(q) && !(p.item_code ?? "").toLowerCase().includes(q)) return false;
    if (filter === "low") return p.stock_qty !== null && p.stock_qty > 0 && p.stock_qty <= LOW_STOCK;
    if (filter === "out") return p.stock_qty !== null && p.stock_qty <= 0;
    if (filter === "untracked") return p.stock_qty === null;
    return true;
  });

  const tracked = products.filter((p) => p.stock_qty !== null);
  const totalUnits = tracked.reduce((a, p) => a + (p.stock_qty ?? 0), 0);
  const totalValue = tracked.reduce((a, p) => a + Math.max(0, p.stock_qty ?? 0) * p.price, 0);
  const lowCount = tracked.filter((p) => (p.stock_qty ?? 0) <= LOW_STOCK).length;

  /** Gives the item a barcode number if it has none, then prints `copies` labels. */
  async function printLabels(p: Product, copies: number) {
    showLoader("Preparing labels…");
    try {
      let code = p.item_code?.trim() ?? "";
      if (!code) {
        code = await generateUniqueBarcode(supabase as never, businessId);
        const { error } = await supabase.from("products" as never).update({ item_code: code } as never).eq("id", p.id);
        if (error) throw new Error(error.message);
      }
      await printLabelItems(
        [{ item: { name: p.name, price: p.price, code }, copies }],
        barcodeSettings,
        businessName,
        `labels-${p.name.replace(/[^\w]+/g, "-")}.pdf`
      );
      router.refresh();
    } catch (e) {
      setNotice((e as Error).message || "Could not prepare labels.");
    } finally {
      hideLoader();
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Stock</h1>
          <p className="text-sm text-text-soft">
            Update stock, change prices and print barcode labels for your {itemLabelPlural.toLowerCase()}.
          </p>
        </div>
        <Link
          href="/dashboard/settings?tab=barcode"
          className="inline-flex items-center justify-center rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text hover:bg-paper"
        >
          Label size &amp; design
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Items tracked", String(tracked.length)],
          ["Total units", String(totalUnits)],
          ["Stock value", money(totalValue)],
          ["Low / out", String(lowCount)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-paper-fold bg-paper-card p-3.5 shadow-card">
            <div className="text-xs text-text-soft">{k}</div>
            <div className="font-ledger text-lg font-semibold text-text">{v}</div>
          </div>
        ))}
      </div>

      {notice && (
        <p className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert" onClick={() => setNotice(null)}>
          {notice}
        </p>
      )}

      <CategoryBar items={products} value={category} onChange={setCategory} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or barcode…"
          className="w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["all", "All"],
              ["low", "Low stock"],
              ["out", "Out of stock"],
              ["untracked", "Not tracked"],
            ] as [Filter, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                filter === id ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text-soft hover:bg-paper"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-12 text-center text-sm text-text-soft">
          {products.length === 0 ? "No items yet. Add items first, then manage their stock here." : "Nothing matches."}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((p) => {
            const out = p.stock_qty !== null && p.stock_qty <= 0;
            const low = p.stock_qty !== null && p.stock_qty > 0 && p.stock_qty <= LOW_STOCK;
            return (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-xl border border-paper-fold bg-paper-card p-3.5 shadow-card sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-text">{p.name}</div>
                  <div className="text-xs text-text-soft">
                    {money(p.price)} / {p.unit}
                    {p.item_code ? (
                      <span className="ml-2 font-ledger">{p.item_code}</span>
                    ) : (
                      <span className="ml-2 italic">no barcode yet</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      p.stock_qty === null
                        ? "bg-paper text-text-soft"
                        : out
                          ? "bg-alert/10 text-alert"
                          : low
                            ? "bg-brass/15 text-brass-dark"
                            : "bg-green-100 text-green-800"
                    }`}
                  >
                    {p.stock_qty === null ? "Not tracked" : `${p.stock_qty} ${p.unit}`}
                  </span>
                  <button
                    onClick={() => setTarget(p)}
                    className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ink-light"
                  >
                    Update stock
                  </button>
                  <button
                    onClick={() => setLabelFor(p)}
                    className="rounded-lg border border-paper-fold bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-paper"
                  >
                    Barcode
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {target && <UpdateStockModal product={target} onClose={() => setTarget(null)} onPrint={printLabels} />}
      {labelFor && (
        <CopiesModal
          product={labelFor}
          onClose={() => setLabelFor(null)}
          onPrint={async (copies) => {
            const p = labelFor;
            setLabelFor(null);
            await printLabels(p, copies);
          }}
        />
      )}
    </div>
  );
}

function CopiesModal({
  product,
  onClose,
  onPrint,
}: {
  product: Product;
  onClose: () => void;
  onPrint: (copies: number) => void;
}) {
  const [copies, setCopies] = useState("1");
  return (
    <Overlay onClose={onClose} title={`Barcode · ${product.name}`}>
      <p className="text-sm text-text-soft">
        {product.item_code ? `Barcode ${product.item_code}.` : "A new unique barcode will be created for this item."} How
        many labels?
      </p>
      <input type="number" min="1" value={copies} onChange={(e) => setCopies(e.target.value)} className={inputCls} />
      <Buttons onCancel={onClose} onOk={() => onPrint(Math.max(1, parseInt(copies, 10) || 1))} okLabel="Print labels" />
    </Overlay>
  );
}

/** Sub-units for weight / volume items: rice in kg -> g, oil in litre -> ml. Other items have none. */
function packUnits(unit: string): { label: string; factor: number }[] {
  const u = unit.trim().toLowerCase();
  if (/^(kg|kgs|kilogram|kilograms)$/.test(u)) return [{ label: "g", factor: 0.001 }, { label: "kg", factor: 1 }];
  if (/^(l|ltr|litre|litres|liter|liters)$/.test(u)) return [{ label: "ml", factor: 0.001 }, { label: "l", factor: 1 }];
  return [];
}
const round3 = (n: number) => Math.round(n * 1000) / 1000;

type Step = "qty" | "price" | "barcode";

function UpdateStockModal({
  product,
  onClose,
  onPrint,
}: {
  product: Product;
  onClose: () => void;
  onPrint: (p: Product, copies: number) => Promise<void>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();
  const wasTracked = product.stock_qty !== null;
  const current = product.stock_qty ?? 0;

  const [step, setStep] = useState<Step>("qty");
  const [mode, setMode] = useState<"add" | "reduce" | "set">("add");
  const [qty, setQty] = useState("");
  // Weight / volume items can be counted in packs (e.g. 5 packs of 250 g) instead of kg.
  const subUnits = packUnits(product.unit);
  const [byPack, setByPack] = useState(false);
  const [packSize, setPackSize] = useState("250");
  const [packUnit, setPackUnit] = useState(subUnits[0]?.label ?? "");
  const [changePrice, setChangePrice] = useState<boolean | null>(null);
  const [price, setPrice] = useState(String(product.price));
  const [error, setError] = useState<string | null>(null);

  const n = parseFloat(qty);
  const packFactor = subUnits.find((x) => x.label === packUnit)?.factor ?? 1;
  const sizeN = parseFloat(packSize);
  const perPack = round3(sizeN * packFactor); // one pack, in the item's own unit (kg)
  const amount = byPack ? round3(n * perPack) : n; // what changes, in the item's own unit
  const valid =
    Number.isFinite(n) && n >= 0 && (mode === "set" || n > 0) && (!byPack || (sizeN > 0 && Number.isFinite(sizeN)));
  const newStock = !valid ? current : round3(mode === "add" ? current + amount : mode === "reduce" ? current - amount : amount);
  const packLabel = `${packSize} ${packUnit}`;
  const newPrice = changePrice ? parseFloat(price) : product.price;

  async function save(printCopies: number | null) {
    setError(null);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      setError("Enter a valid price.");
      return;
    }
    showLoader("Updating stock…");
    const payload: Record<string, unknown> = { stock_qty: newStock };
    if (changePrice) payload.price = newPrice;
    const { error: err } = await supabase
      .from("products" as never)
      .update(payload as never)
      .eq("id", product.id);
    hideLoader();
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
    onClose();
    if (printCopies !== null) {
      // The label shows the new price.
      // A pack label shows the pack (e.g. "Rice 250 g") and the price of one pack.
      const forLabel = byPack
        ? { ...product, name: `${product.name} ${packLabel}`, price: round3(newPrice * perPack), stock_qty: newStock }
        : { ...product, price: newPrice, stock_qty: newStock };
      await onPrint(forLabel, printCopies);
    }
  }

  return (
    <Overlay onClose={onClose} title={`Update stock · ${product.name}`}>
      {step === "qty" && (
        <>
          <p className="text-sm text-text-soft">
            {wasTracked
              ? `Current stock: ${current} ${product.unit}`
              : "Stock is not tracked for this item yet; saving starts tracking it."}
          </p>
          <div className="flex gap-1.5">
            {(
              [
                ["add", "Add"],
                ["reduce", "Reduce"],
                ["set", "Set exact"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  mode === id ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text-soft"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {subUnits.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text">Count stock in</span>
              <div className="flex gap-1.5">
                {[
                  [false, product.unit],
                  [true, "Packs"],
                ].map(([v, label]) => (
                  <button
                    key={String(label)}
                    type="button"
                    onClick={() => setByPack(v as boolean)}
                    className={`flex-1 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      byPack === v ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text-soft"
                    }`}
                  >
                    {label as string}
                  </button>
                ))}
              </div>
              {byPack && (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ["100", subUnits[0].label],
                      ["250", subUnits[0].label],
                      ["500", subUnits[0].label],
                      ["1", subUnits[subUnits.length - 1].label],
                    ].map(([sz, un]) => (
                      <button
                        key={sz + un}
                        type="button"
                        onClick={() => {
                          setPackSize(sz);
                          setPackUnit(un);
                        }}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          packSize === sz && packUnit === un
                            ? "border-ink bg-ink text-paper"
                            : "border-paper-fold bg-white text-text-soft"
                        }`}
                      >
                        {sz} {un}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={packSize}
                      onChange={(e) => setPackSize(e.target.value)}
                      aria-label="Pack size"
                      className={inputCls}
                    />
                    <select value={packUnit} onChange={(e) => setPackUnit(e.target.value)} className={inputCls}>
                      {subUnits.map((x) => (
                        <option key={x.label}>{x.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">
              {mode === "add" ? "Quantity to add" : mode === "reduce" ? "Quantity to reduce" : "New stock quantity"} (
              {byPack ? `packs of ${packLabel}` : product.unit})
            </span>
            <input
              autoFocus
              type="number"
              min="0"
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className={inputCls}
            />
          </label>
          {valid && (
            <p className="text-sm text-text">
              {byPack && (
                <>
                  {n} × {packLabel} = {amount} {product.unit}
                  <br />
                </>
              )}
              New stock: <strong>{newStock}</strong> {product.unit}
            </p>
          )}
          <Buttons onCancel={onClose} onOk={() => setStep("price")} okLabel="Next" disabled={!valid} />
        </>
      )}

      {step === "price" && (
        <>
          <p className="text-sm font-medium text-text">Update the price too?</p>
          <p className="text-sm text-text-soft">
            Current price: {money(product.price)} / {product.unit}
          </p>
          <div className="flex gap-2">
            {[true, false].map((yes) => (
              <button
                key={String(yes)}
                type="button"
                onClick={() => setChangePrice(yes)}
                className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold ${
                  changePrice === yes ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text"
                }`}
              >
                {yes ? "Yes, change price" : "No"}
              </button>
            ))}
          </div>
          {changePrice && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">New price (₹ per {product.unit})</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputCls}
              />
            </label>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep("qty")}
              className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text"
            >
              Back
            </button>
            <button
              type="button"
              disabled={changePrice === null || (changePrice && !(parseFloat(price) >= 0))}
              onClick={() => setStep("barcode")}
              className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {step === "barcode" && (
        <BarcodeStep
          product={product}
          defaultCopies={mode === "add" ? Math.max(1, Math.round(n)) : 1}
          error={error}
          onBack={() => setStep("price")}
          onSave={save}
        />
      )}
    </Overlay>
  );
}

function BarcodeStep({
  product,
  defaultCopies,
  error,
  onBack,
  onSave,
}: {
  product: Product;
  defaultCopies: number;
  error: string | null;
  onBack: () => void;
  onSave: (printCopies: number | null) => Promise<void>;
}) {
  const [print, setPrint] = useState<boolean | null>(null);
  const [copies, setCopies] = useState(String(defaultCopies));
  const [busy, setBusy] = useState(false);

  return (
    <>
      <p className="text-sm font-medium text-text">Generate barcode labels to print?</p>
      <p className="text-sm text-text-soft">
        {product.item_code
          ? `Barcode ${product.item_code} will be used.`
          : "A new unique barcode will be created and saved on the item."}
      </p>
      <div className="flex gap-2">
        {[true, false].map((yes) => (
          <button
            key={String(yes)}
            type="button"
            onClick={() => setPrint(yes)}
            className={`flex-1 rounded-xl border px-4 py-2 text-sm font-semibold ${
              print === yes ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text"
            }`}
          >
            {yes ? "Yes, print labels" : "No"}
          </button>
        ))}
      </div>
      {print && (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Number of labels (one per unit added)</span>
          <input autoFocus type="number" min="1" value={copies} onChange={(e) => setCopies(e.target.value)} className={inputCls} />
        </label>
      )}
      {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text"
        >
          Back
        </button>
        <button
          type="button"
          disabled={print === null || busy}
          onClick={async () => {
            setBusy(true);
            await onSave(print ? Math.max(1, parseInt(copies, 10) || 1) : null);
            setBusy(false);
          }}
          className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {print ? "Save & print labels" : "Save stock"}
        </button>
      </div>
    </>
  );
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[440px] flex-col gap-4 overflow-y-auto rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2"
      >
        <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Buttons({
  onCancel,
  onOk,
  okLabel,
  disabled,
}: {
  onCancel: () => void;
  onOk: () => void;
  okLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text"
      >
        Cancel
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onOk}
        className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
      >
        {okLabel}
      </button>
    </div>
  );
}
