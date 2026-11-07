"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildEwayBillJson, type EwayExtra } from "@/lib/ewayBillJson";
import type { Business, Customer, Invoice, InvoiceItem } from "@/types/database";

const PORTAL = "https://ewaybillgst.gov.in";
const input = "rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink";
const pin = (text: string | null | undefined) => /\b(\d{6})\b/.exec(text ?? "")?.[1] ?? "";

/** Invoice page: saved e-way bill details, plus the free way to make one on the GST portal. */
export function EwayBillPanel({
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
  const [saved, setSaved] = useState<{ no: string | null; until: string | null }>({ no: invoice.eway_bill_number ?? null, until: invoice.eway_valid_until ?? null });
  const [numInput, setNumInput] = useState(invoice.eway_bill_number ?? "");
  const [untilInput, setUntilInput] = useState(invoice.eway_valid_until ?? "");
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [f, setF] = useState<EwayExtra>({
    fromPincode: pin(business?.address),
    fromPlace: "",
    toPincode: pin(invoice.delivery_address) || pin(customer?.address),
    toPlace: "",
    distanceKm: invoice.eway_distance_km != null ? String(invoice.eway_distance_km) : "",
    vehicleNo: invoice.vehicle_number ?? "",
    transporterId: invoice.eway_transporter_id ?? "",
    transporterName: invoice.transport_name ?? "",
  });
  const set = (k: keyof EwayExtra) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function saveNumber() {
    const no = numInput.replace(/\s/g, "");
    if (no && !/^\d{12}$/.test(no)) return setSaveMsg({ ok: false, text: "An e-way bill number has 12 digits." });
    setSaving(true);
    setSaveMsg(null);
    const patch = {
      eway_bill_number: no || null,
      eway_bill_date: no ? invoice.eway_bill_date ?? new Date().toISOString().slice(0, 10) : null,
      eway_valid_until: no ? untilInput || null : null,
    };
    const { error } = await createClient().from("invoices" as never).update(patch as never).eq("id", invoice.id);
    setSaving(false);
    if (error) return setSaveMsg({ ok: false, text: error.message });
    setSaved({ no: patch.eway_bill_number, until: patch.eway_valid_until });
    setSaveMsg({ ok: true, text: no ? "Saved. It now prints on the invoice." : "Removed." });
    setEntering(false);
    router.refresh();
  }

  function download() {
    if (!business) return setProblems(["Business details could not be loaded."]);
    const r = buildEwayBillJson(invoice, items, customer, business, f);
    setProblems(r.problems);
    if (!r.json) return;
    const url = URL.createObjectURL(new Blob([r.json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `eway-bill-${invoice.invoice_number}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setDone(true);
  }

  return (
    <div className="rounded-xl2 border border-paper-fold bg-paper-card p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-soft">E-way bill</p>
          {saved.no ? (
            <p className="mt-1 text-sm text-text">
              <span className="font-ledger font-semibold">{saved.no}</span>
              {saved.until && <span className="text-text-soft"> · valid until {saved.until}</span>}
              {invoice.eway_distance_km ? <span className="text-text-soft"> · {invoice.eway_distance_km} km</span> : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-text-soft">No e-way bill saved on this invoice yet.</p>
          )}
        </div>
        {allowed ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setOpen((o) => !o)} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper hover:bg-ink-light">
              Make e-way bill (free)
            </button>
            <button onClick={() => setEntering((o) => !o)} className="rounded-lg border border-paper-fold bg-white px-3 py-1.5 text-xs font-semibold text-text hover:bg-paper">
              {saved.no ? "Edit e-way bill number" : "Enter e-way bill number"}
            </button>
          </div>
        ) : (
          <p className="rounded-lg bg-brass/10 px-3 py-1.5 text-xs text-brass-dark">Available on the Pro plan.</p>
        )}
      </div>

      {allowed && entering && (
        <div className="mt-4 grid gap-3 border-t border-paper-fold pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">E-way bill number (12 digits)</span>
            <input inputMode="numeric" maxLength={12} value={numInput} onChange={(e) => setNumInput(e.target.value.replace(/\D/g, ""))} className={input} autoFocus /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Valid until (optional)</span>
            <input type="date" value={untilInput} onChange={(e) => setUntilInput(e.target.value)} className={input} /></label>
          <button onClick={saveNumber} disabled={saving} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
        </div>
      )}
      {saveMsg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${saveMsg.ok ? "bg-success-bg text-success" : "bg-alert-bg text-alert"}`}>{saveMsg.text}</p>}

      {allowed && open && (
        <div className="mt-4 flex flex-col gap-4 border-t border-paper-fold pt-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-text">
            <li>Fill the few details below and press <strong>Download file</strong>. Everything else comes from this invoice.</li>
            <li>
              Open the{" "}
              <a href={PORTAL} target="_blank" rel="noreferrer" className="font-semibold text-ink underline">
                GST e-way bill portal
              </a>{" "}
              and sign in with <strong>your own</strong> GST account.
            </li>
            <li>Go to <strong>E-Waybill → Generate Bulk</strong>, upload the file, then download the result to see the e-way bill number.</li>
            <li>Come back, press <strong>Enter e-way bill number</strong> and type it. It then prints on the invoice.</li>
          </ol>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">From pincode</span>
              <input inputMode="numeric" maxLength={6} value={f.fromPincode} onChange={set("fromPincode")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">From place (city)</span>
              <input value={f.fromPlace} onChange={set("fromPlace")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">To pincode</span>
              <input inputMode="numeric" maxLength={6} value={f.toPincode} onChange={set("toPincode")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">To place (city)</span>
              <input value={f.toPlace} onChange={set("toPlace")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Distance in km (0 = portal works it out)</span>
              <input inputMode="numeric" value={f.distanceKm} onChange={set("distanceKm")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Vehicle number</span>
              <input value={f.vehicleNo} onChange={set("vehicleNo")} placeholder="TN09AB1234" className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Transporter ID (GSTIN, optional)</span>
              <input value={f.transporterId} onChange={set("transporterId")} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Transporter name (optional)</span>
              <input value={f.transporterName} onChange={set("transporterName")} className={input} /></label>
          </div>

          {problems.length > 0 && (
            <ul className="list-disc space-y-0.5 rounded-lg bg-alert-bg px-6 py-2.5 text-sm text-alert">
              {problems.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          {done && problems.length === 0 && (
            <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success">
              File downloaded. Now upload it on the GST portal under Generate Bulk.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={download} className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light">Download file</button>
            <a href={PORTAL} target="_blank" rel="noreferrer" className="rounded-xl border border-paper-fold bg-white px-4 py-2.5 text-sm font-semibold text-text hover:bg-paper">
              Open GST e-way bill portal
            </a>
          </div>
          <p className="text-xs text-text-soft">
            Zen Biz never asks for your GST portal password; you sign in on the government site yourself. Generating this way is free; the government portal does not charge for e-way bills.
          </p>
        </div>
      )}
    </div>
  );
}
