"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";
import {
  DEFAULT_INVOICE_TITLES,
  NUMBER_KIND_LABELS,
  formatNumber,
  getInvoiceTitles,
  getNumberFormat,
  type FormatSettings,
  type NumberFormat,
  type NumberKind,
} from "@/lib/formatSettings";
import type { Business } from "@/types/database";

const KINDS: NumberKind[] = ["invoice", "quotation", "proforma", "purchase", "challan", "customer"];

export function FormatSettingsForm({ business }: { business: Business }) {
  const router = useRouter();
  const supabase = createClient();
  const { showLoader, hideLoader } = useGlobalLoader();
  const stored = business.format_settings ?? null;

  const [titles, setTitles] = useState<string[]>(getInvoiceTitles(stored));
  const [defaultTitle, setDefaultTitle] = useState(stored?.defaultInvoiceTitle ?? getInvoiceTitles(stored)[0]);
  const [newTitle, setNewTitle] = useState("");
  const [quotationTitle, setQuotationTitle] = useState(stored?.titles?.quotation ?? "QUOTATION");
  const [purchaseTitle, setPurchaseTitle] = useState(stored?.titles?.purchase ?? "PURCHASE");
  const [numbering, setNumbering] = useState<Record<NumberKind, NumberFormat>>(() => {
    const out = {} as Record<NumberKind, NumberFormat>;
    for (const k of KINDS) out[k] = getNumberFormat(stored, k);
    return out;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function touch() {
    setSaved(false);
  }

  function addTitle() {
    const t = newTitle.trim().toUpperCase();
    if (!t) return;
    if (t.length > 30) {
      setError("A title can be at most 30 characters.");
      return;
    }
    if (!titles.includes(t)) setTitles((list) => [...list, t]);
    setNewTitle("");
    touch();
  }

  function removeTitle(t: string) {
    if (titles.length <= 1) return;
    const next = titles.filter((x) => x !== t);
    setTitles(next);
    if (defaultTitle === t) setDefaultTitle(next[0]);
    touch();
  }

  function patchNumbering(kind: NumberKind, patch: Partial<NumberFormat>) {
    touch();
    setNumbering((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));
  }

  async function handleSave() {
    setError(null);
    for (const k of KINDS) {
      if (numbering[k].prefix.length > 20) {
        setError(`${NUMBER_KIND_LABELS[k]}: the prefix can be at most 20 characters.`);
        return;
      }
    }
    setSaving(true);
    showLoader("Saving formats…");
    const settings: FormatSettings = {
      invoiceTitles: titles,
      defaultInvoiceTitle: titles.includes(defaultTitle) ? defaultTitle : titles[0],
      titles: {
        quotation: quotationTitle.trim().toUpperCase() || "QUOTATION",
        purchase: purchaseTitle.trim().toUpperCase() || "PURCHASE",
      },
      numbering,
    };
    const { error: err } = await supabase
      .from("businesses" as never)
      .update({ format_settings: settings } as never)
      .eq("id", business.id);
    setSaving(false);
    hideLoader();
    if (err) {
      setError(err.message || "Could not save. Please try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  const inputCls =
    "rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text placeholder:text-text-soft/60 focus:border-ink";

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">Number & title formats</h2>
        <p className="text-sm text-text-soft">
          Choose how document titles and numbers look for this business. Each business has its own.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-text">Invoice titles</p>
        <p className="text-xs text-text-soft">
          These appear in a "Document title" dropdown when you make an invoice, so you can print Tax Invoice,
          Bill, Bill of Supply, or anything of your own.
        </p>
        <div className="flex flex-wrap gap-2">
          {titles.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1.5 rounded-full border border-paper-fold bg-white px-3 py-1 text-xs font-semibold text-text"
            >
              {t}
              {titles.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTitle(t)}
                  aria-label={`Remove ${t}`}
                  className="text-text-soft hover:text-alert"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTitle();
              }
            }}
            placeholder="Add your own, e.g. PROFORMA INVOICE"
            className={`${inputCls} w-72 max-w-full`}
          />
          <button
            type="button"
            onClick={addTitle}
            className="rounded-xl border border-paper-fold px-3 py-2 text-xs font-semibold text-text hover:bg-paper"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setTitles(DEFAULT_INVOICE_TITLES);
              setDefaultTitle(DEFAULT_INVOICE_TITLES[0]);
              touch();
            }}
            className="text-xs font-medium text-text-soft hover:text-text"
          >
            Reset list
          </button>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text">Title used by default for new invoices</span>
          <select
            value={defaultTitle}
            onChange={(e) => {
              setDefaultTitle(e.target.value);
              touch();
            }}
            className={`${inputCls} max-w-xs`}
          >
            {titles.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text">Quotation title</span>
            <input
              value={quotationTitle}
              onChange={(e) => {
                setQuotationTitle(e.target.value);
                touch();
              }}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text">Purchase title</span>
            <input
              value={purchaseTitle}
              onChange={(e) => {
                setPurchaseTitle(e.target.value);
                touch();
              }}
              className={inputCls}
            />
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <p className="text-sm font-semibold text-text">Number formats</p>
        <p className="text-xs text-text-soft">
          Number = prefix + digits. Use {"{YYYY}"}, {"{YY}"} or {"{MM}"} in the prefix for the year or month,
          e.g. <span className="font-ledger">INV/{"{YY}"}-</span> gives INV/26-0001. "Start at" is the first number;
          after that, each new one continues from the highest used.
        </p>
        <div className="flex flex-col gap-2">
          {KINDS.map((k) => (
            <div
              key={k}
              className="grid items-end gap-3 rounded-xl border border-paper-fold bg-white p-3 sm:grid-cols-[1.3fr_1fr_0.7fr_0.8fr_1.2fr]"
            >
              <p className="text-sm font-medium text-text sm:self-center">{NUMBER_KIND_LABELS[k]}</p>
              <label className="flex flex-col gap-1">
                <span className="text-[0.68rem] font-medium uppercase tracking-wide text-text-soft">Prefix</span>
                <input
                  value={numbering[k].prefix}
                  onChange={(e) => patchNumbering(k, { prefix: e.target.value })}
                  maxLength={20}
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[0.68rem] font-medium uppercase tracking-wide text-text-soft">Digits</span>
                <select
                  value={numbering[k].digits}
                  onChange={(e) => patchNumbering(k, { digits: Number(e.target.value) })}
                  className={inputCls}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[0.68rem] font-medium uppercase tracking-wide text-text-soft">Start at</span>
                <input
                  type="number"
                  min={0}
                  value={numbering[k].start}
                  onChange={(e) => patchNumbering(k, { start: Math.max(0, parseInt(e.target.value) || 0) })}
                  className={inputCls}
                />
              </label>
              <p className="font-ledger text-sm text-text sm:self-center">
                <span className="mr-1.5 text-[0.68rem] font-medium uppercase tracking-wide text-text-soft">e.g.</span>
                {formatNumber(numbering[k], numbering[k].start || 1)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success" role="status">
          Saved. New documents will use these formats.
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-start rounded-xl bg-ink px-6 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save formats"}
      </button>
    </div>
  );
}
