"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildEinvoiceJson, type EinvoiceExtra } from "@/lib/einvoiceJson";
import type { Business, Customer, Invoice, InvoiceItem } from "@/types/database";

const PORTAL = "https://einvoice1.gst.gov.in";
const input = "rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink";
const pin = (text: string | null | undefined) => /\b(\d{6})\b/.exec(text ?? "")?.[1] ?? "";

/** Free e-invoice (IRN): download the file here, upload it on the GST e-invoice portal, then type the IRN back. */
export function EinvoicePanel({
  invoice,
  items,
  customer,
  business,
  allowed,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer | null;
  business: Business | null;
  allowed: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [entering, setEntering] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [irn, setIrn] = useState(invoice.irn ?? "");
  const [ack, setAck] = useState(invoice.irn_ack_no ?? "");
  const [saved, setSaved] = useState<string | null>(invoice.irn ?? null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<EinvoiceExtra>({
    fromPlace: "",
    fromPincode: pin(business?.address),
    toPlace: "",
    toPincode: pin(invoice.delivery_address) || pin(customer?.address),
  });
  const set = (k: keyof EinvoiceExtra) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  function download() {
    if (!business) return setProblems(["Business details could not be loaded."]);
    const r = buildEinvoiceJson(invoice, items, customer, business, f);
    setProblems(r.problems);
    if (!r.json) return;
    const url = URL.createObjectURL(new Blob([r.json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `e-invoice-${invoice.invoice_number}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setDone(true);
  }

  async function save() {
    const v = irn.trim();
    if (v && !/^[a-fA-F0-9]{64}$/.test(v)) return setMsg({ ok: false, text: "The IRN is 64 letters and numbers. Copy it from the portal result." });
    setSaving(true);
    setMsg(null);
    const patch = { irn: v || null, irn_ack_no: v ? ack.trim() || null : null, irn_date: v ? invoice.irn_date ?? new Date().toISOString().slice(0, 10) : null };
    const { error } = await createClient().from("invoices" as never).update(patch as never).eq("id", invoice.id);
    setSaving(false);
    if (error) return setMsg({ ok: false, text: /irn/.test(error.message) ? "Run supabase/migration_51.sql in the Supabase SQL editor." : error.message });
    setSaved(patch.irn);
    setMsg({ ok: true, text: v ? "Saved. The IRN now prints on the invoice." : "Removed." });
    setEntering(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">E-invoice (IRN)</p>
          {saved ? (
            <p className="mt-1 break-all font-ledger text-xs font-semibold text-text">{saved}</p>
          ) : (
            <p className="mt-1 text-sm text-text-soft">No IRN saved on this invoice yet.</p>
          )}
        </div>
        {allowed ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOpen((o) => !o)} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ink-light">Make e-invoice (free)</button>
            <button onClick={() => setEntering((o) => !o)} className="rounded-lg border border-paper-fold bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-paper">
              {saved ? "Edit IRN" : "Enter IRN"}
            </button>
          </div>
        ) : (
          <p className="rounded-lg bg-brass/10 px-3 py-1.5 text-xs text-brass-dark">Available on the Pro plan.</p>
        )}
      </div>

      {allowed && entering && (
        <div className="mt-4 grid gap-3 border-t border-paper-fold pt-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">IRN (64 characters)</span>
            <input value={irn} onChange={(e) => setIrn(e.target.value.trim())} maxLength={64} className={`${input} font-ledger`} autoFocus /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Ack no (optional)</span>
            <input value={ack} onChange={(e) => setAck(e.target.value.replace(/\D/g, ""))} className={input} /></label>
          <button onClick={save} disabled={saving} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      )}
      {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-success-bg text-success" : "bg-alert-bg text-alert"}`}>{msg.text}</p>}

      {allowed && open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-paper-fold pt-4">
          <p className="text-xs text-text-soft">
            E-invoice is needed only if your yearly turnover is above the limit set by the GST department, and only for sales to GST-registered businesses (B2B).
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-text">
            <li>Fill your city and pincode, and the customer&apos;s, then press <strong>Download file</strong>.</li>
            <li>
              Open the{" "}
              <a href={PORTAL} target="_blank" rel="noreferrer" className="font-semibold text-ink underline">GST e-invoice portal</a>{" "}
              and sign in with <strong>your own</strong> GST account.
            </li>
            <li>Choose the <strong>Bulk Generation</strong> option under e-Invoice, upload the file, and download the result.</li>
            <li>Copy the <strong>IRN</strong> (64 characters) and Ack no from the result, come back, press <strong>Enter IRN</strong> and paste it. It then prints on the invoice.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Your city</span>
              <input value={f.fromPlace} onChange={set("fromPlace")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Your pincode</span>
              <input inputMode="numeric" maxLength={6} value={f.fromPincode} onChange={set("fromPincode")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Customer city</span>
              <input value={f.toPlace} onChange={set("toPlace")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Customer pincode</span>
              <input inputMode="numeric" maxLength={6} value={f.toPincode} onChange={set("toPincode")} className={input} /></label>
          </div>
          {problems.length > 0 && (
            <ul className="list-disc space-y-0.5 rounded-lg bg-alert-bg px-6 py-2.5 text-sm text-alert">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          {done && problems.length === 0 && (
            <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success">File downloaded. Now upload it on the GST e-invoice portal under Bulk Generation.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={download} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light">Download file</button>
            <a href={PORTAL} target="_blank" rel="noreferrer" className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text hover:bg-paper">Open GST e-invoice portal</a>
          </div>
          <p className="text-xs text-text-soft">Zen Biz never asks for your GST portal password. Generating this way is free.</p>
        </div>
      )}
    </div>
  );
}
