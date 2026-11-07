"use client";

import { useMemo, useState } from "react";
import { sharePdfToWhatsApp } from "@/lib/shareFile";
import { sendInvoiceEmail } from "@/lib/actions/emailActions";

export type ReportEntry = {
  date: string; // YYYY-MM-DD
  side: "sale" | "purchase" | "income" | "expense";
  gst: number;
  subtotal: number;
  total: number;
};

type Kind = "gst" | "pl";
type Preset = "thisMonth" | "lastMonth" | "thisFY" | "lastFY" | "all" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
  { id: "thisFY", label: "This financial year" },
  { id: "lastFY", label: "Last financial year" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom dates" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

function presetRange(p: Preset): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const fyStart = m >= 4 ? y : y - 1;
  switch (p) {
    case "thisMonth":
      return { from: iso(y, m, 1), to: iso(y, m, new Date(y, m, 0).getDate()) };
    case "lastMonth": {
      const ly = m === 1 ? y - 1 : y;
      const lm = m === 1 ? 12 : m - 1;
      return { from: iso(ly, lm, 1), to: iso(ly, lm, new Date(ly, lm, 0).getDate()) };
    }
    case "thisFY":
      return { from: iso(fyStart, 4, 1), to: iso(fyStart + 1, 3, 31) };
    case "lastFY":
      return { from: iso(fyStart - 1, 4, 1), to: iso(fyStart, 3, 31) };
    default:
      return { from: "", to: "" };
  }
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function money(n: number, plain = false) {
  const s = n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return plain ? `Rs. ${s}` : `₹${s}`;
}

export function ReportClient({
  kind,
  entries,
  businessName,
  businessId,
}: {
  kind: Kind;
  entries: ReportEntry[];
  businessName: string;
  businessId: string;
}) {
  const [preset, setPreset] = useState<Preset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [mail, setMail] = useState<{ to: string; subject: string; message: string } | null>(null);
  const [mailErr, setMailErr] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  function choose(p: Preset) {
    setPreset(p);
    if (p !== "custom") {
      const r = presetRange(p);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const title = kind === "gst" ? "Monthly GST Report" : "Profit & Loss Report";
  const periodLabel =
    !from && !to ? "All time" : `${from || "start"} to ${to || "today"}`;

  const rows = useMemo(() => {
    const map = new Map<string, { a: number; b: number; c: number; d: number }>();
    for (const e of entries) {
      if (kind === "gst" && (e.side === "income" || e.side === "expense")) continue;
      const d = e.date.slice(0, 10);
      if (from && d < from) continue;
      if (to && d > to) continue;
      const key = d.slice(0, 7);
      const r = map.get(key) ?? { a: 0, b: 0, c: 0, d: 0 };
      if (kind === "gst") {
        if (e.side === "sale") {
          r.a += e.subtotal; // sales ex-GST
          r.b += e.gst; // sales GST
        } else {
          r.c += e.subtotal;
          r.d += e.gst;
        }
      } else if (e.side === "sale") r.a += e.total;
      else if (e.side === "income") r.b += e.total; // other income
      else if (e.side === "expense") r.d += e.total; // salary, petrol, rent...
      else r.c += e.total;
      map.set(key, r);
    }
    return Array.from(map.entries())
      .sort((x, y) => y[0].localeCompare(x[0]))
      .map(([key, v]) => ({ key, label: monthLabel(key), ...v }));
  }, [entries, from, to, kind]);

  // Table definition shared by screen, PDF and Word.
  const head =
    kind === "gst"
      ? ["Month", "Sales (ex-GST)", "Sales GST", "Purchases (ex-GST)", "Purchase GST", "Net GST payable"]
      : ["Month", "Sales", "Other income", "Purchases", "Expenses", "Net profit"];

  const body: string[][] = rows.map((r) =>
    kind === "gst"
      ? [r.label, money(r.a, true), money(r.b, true), money(r.c, true), money(r.d, true), money(r.b - r.d, true)]
      : [r.label, money(r.a, true), money(r.b, true), money(r.c, true), money(r.d, true), money(r.a + r.b - r.c - r.d, true)]
  );

  const tot = rows.reduce((t, r) => ({ a: t.a + r.a, b: t.b + r.b, c: t.c + r.c, d: t.d + r.d }), { a: 0, b: 0, c: 0, d: 0 });
  const totalRow =
    kind === "gst"
      ? ["Total", money(tot.a, true), money(tot.b, true), money(tot.c, true), money(tot.d, true), money(tot.b - tot.d, true)]
      : ["Total", money(tot.a, true), money(tot.b, true), money(tot.c, true), money(tot.d, true), money(tot.a + tot.b - tot.c - tot.d, true)];

  const summaryText =
    `${title} — ${businessName}\nPeriod: ${periodLabel}\n` +
    (kind === "gst"
      ? `Sales GST: ${money(tot.b, true)}\nPurchase GST: ${money(tot.d, true)}\nNet GST payable: ${money(tot.b - tot.d, true)}`
      : `Sales: ${money(tot.a, true)}\nOther income: ${money(tot.b, true)}\nPurchases: ${money(tot.c, true)}\nExpenses: ${money(tot.d, true)}\nNet profit: ${money(tot.a + tot.b - tot.c - tot.d, true)}`);

  const fileBase = `${kind === "gst" ? "GST-report" : "Profit-Loss"}-${from || "all"}${to ? "_to_" + to : ""}`;

  async function buildPdf(): Promise<Blob> {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: kind === "gst" ? "landscape" : "portrait", unit: "pt", format: "a4" });
    doc.setFontSize(16);
    doc.text(title, 40, 50);
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(businessName, 40, 68);
    doc.text(`Period: ${periodLabel}`, 40, 83);
    autoTable(doc, {
      startY: 100,
      head: [head],
      body: [...body, totalRow],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [31, 41, 55] },
      columnStyles: Object.fromEntries(head.slice(1).map((_, i) => [i + 1, { halign: "right" }])),
      didParseCell: (d) => {
        if (d.section === "body" && d.row.index === body.length) d.cell.styles.fontStyle = "bold";
      },
    });
    return doc.output("blob");
  }

  function save(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function downloadPdf() {
    setBusy(true);
    try {
      save(await buildPdf(), `${fileBase}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  function downloadWord() {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const tr = (cells: string[], th = false, bold = false) =>
      `<tr>${cells
        .map(
          (c, i) =>
            `<${th ? "th" : "td"} style="border:1px solid #999;padding:4px 8px;${i > 0 ? "text-align:right;" : ""}${bold ? "font-weight:bold;" : ""}">${esc(c)}</${th ? "th" : "td"}>`
        )
        .join("")}</tr>`;
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="font-family:Calibri,Arial,sans-serif"><h2>${esc(title)}</h2><p>${esc(businessName)}<br/>Period: ${esc(periodLabel)}</p><table style="border-collapse:collapse;width:100%">${tr(head, true)}${body.map((r) => tr(r)).join("")}${tr(totalRow, false, true)}</table></body></html>`;
    save(new Blob(["﻿", html], { type: "application/msword" }), `${fileBase}.doc`);
  }

  async function sharePdfFile(): Promise<boolean> {
    try {
      const file = new File([await buildPdf()], `${fileBase}.pdf`, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title, text: summaryText });
        return true;
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return true;
    }
    return false;
  }

  async function shareWhatsApp() {
    setBusy(true);
    setNote(null);
    const r = await sharePdfToWhatsApp({
      blob: await buildPdf(),
      filename: `${fileBase}.pdf`,
      text: summaryText,
      fallbackText: `${summaryText}\n\n(The PDF just downloaded — please attach it here.)`,
      businessId,
    });
    setBusy(false);
    if (r === "fallback") setNote("The PDF was downloaded — drag it into the WhatsApp chat to attach it.");
  }

  function openEmail() {
    setNote(null);
    setMailErr(null);
    setMail({ to: "", subject: `${title} — ${businessName}`, message: `Hi,\n\nPlease find attached the ${title} (${periodLabel}).\n\n${summaryText}\n\nThank you,\n${businessName}` });
  }

  async function sendMail() {
    if (!mail) return;
    setSending(true);
    setMailErr(null);
    const blob = await buildPdf();
    const buf = new Uint8Array(await blob.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const r = await sendInvoiceEmail({ businessId, to: mail.to, subject: mail.subject, message: mail.message, pdfBase64: btoa(bin), filename: `${fileBase}.pdf` });
    setSending(false);
    if (r.error) return setMailErr(r.error);
    setNote(`Email sent to ${mail.to}.`);
    setMail(null);
  }

  const btn =
    "rounded-lg border border-paper-fold bg-white px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper disabled:opacity-60";
  const cbtn = "rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition disabled:opacity-60";
  const input =
    "rounded-lg border border-paper-fold bg-white px-2.5 py-1.5 text-sm text-text focus:border-ink focus:outline-none";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl2 border border-paper-fold bg-paper-card p-4 shadow-card">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-soft">Period</span>
            <select value={preset} onChange={(e) => choose(e.target.value as Preset)} className={input}>
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-soft">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className={input}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text-soft">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className={input}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={downloadPdf} disabled={busy || rows.length === 0} className={`${cbtn} bg-rose-600 hover:bg-rose-700`}>
            ⬇ PDF
          </button>
          <button type="button" onClick={downloadWord} disabled={rows.length === 0} className={`${cbtn} bg-blue-600 hover:bg-blue-700`}>
            ⬇ Word
          </button>
          <button type="button" onClick={shareWhatsApp} disabled={busy || rows.length === 0} className={`${cbtn} bg-emerald-600 hover:bg-emerald-700`}>
            WhatsApp
          </button>
          <button type="button" onClick={openEmail} disabled={busy || rows.length === 0} className={`${cbtn} bg-amber-600 hover:bg-amber-700`}>
            ✉ Email
          </button>
        </div>
        {note && <p className="text-xs text-text-soft">{note}</p>}
      </div>

      {mail && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 p-4" onClick={() => !sending && setMail(null)}>
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-xl2 bg-paper-card p-5 shadow-card">
            <p className="text-sm font-semibold text-text">Email this report</p>
            <input type="email" value={mail.to} onChange={(e) => setMail({ ...mail, to: e.target.value })} placeholder="To: email address" className={input} />
            <input value={mail.subject} onChange={(e) => setMail({ ...mail, subject: e.target.value })} className={input} />
            <textarea rows={8} value={mail.message} onChange={(e) => setMail({ ...mail, message: e.target.value })} className={input} />
            <p className="text-xs text-text-soft">The PDF is attached automatically and sent from your connected Gmail.</p>
            {mailErr && <p className="rounded-lg bg-alert-bg px-3 py-2 text-xs text-alert">{mailErr}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setMail(null)} disabled={sending} className="flex-1 rounded-lg border border-paper-fold px-3 py-2 text-sm font-medium text-text hover:bg-paper disabled:opacity-60">Cancel</button>
              <button type="button" onClick={sendMail} disabled={sending || !mail.to.trim()} className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60">{sending ? "Sending…" : "Send email"}</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(kind === "gst"
          ? [
              ["Sales GST collected", money(tot.b)],
              ["Purchase GST paid", money(tot.d)],
              ["Net GST payable", money(tot.b - tot.d)],
            ]
          : [
              ["Total income (sales + other)", money(tot.a + tot.b)],
              ["Total expenses (purchases + other)", money(tot.c + tot.d)],
              ["Net profit", money(tot.a + tot.b - tot.c - tot.d)],
            ]
        ).map(([l, v], i) => {
          const tone = [
            "border-emerald-200 bg-emerald-50 text-emerald-700",
            "border-sky-200 bg-sky-50 text-sky-700",
            "border-violet-200 bg-violet-50 text-violet-700",
          ][i];
          return (
            <div key={l} className={`rounded-xl2 border p-4 shadow-card ${tone}`}>
              <p className="text-xs font-medium uppercase tracking-wide opacity-80">{l}</p>
              <p className="mt-1.5 font-ledger text-xl font-semibold tabular-nums">{v}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-paper-fold bg-indigo-600 text-left text-xs font-semibold uppercase tracking-wide text-white">
              {head.map((h, i) => (
                <th key={h} className={`whitespace-nowrap px-4 py-3 ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-fold">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={head.length} className="px-4 py-8 text-center text-text-soft">
                  Nothing recorded for this period.
                </td>
              </tr>
            ) : (
              <>
                {body.map((r, i) => (
                  <tr key={rows[i].key}>
                    {r.map((c, j) => (
                      <td
                        key={j}
                        className={`whitespace-nowrap px-4 py-3 ${j === 0 ? "font-medium text-text" : "text-right font-ledger tabular-nums text-text"}`}
                      >
                        {j === 0 ? c : c.replace("Rs. ", "₹")}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-indigo-50 font-semibold text-indigo-900">
                  {totalRow.map((c, j) => (
                    <td key={j} className={`whitespace-nowrap px-4 py-3 ${j > 0 ? "text-right font-ledger tabular-nums" : ""}`}>
                      {j === 0 ? c : c.replace("Rs. ", "₹")}
                    </td>
                  ))}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-soft">
        {kind === "gst"
          ? "Net GST payable = GST collected on sales − GST paid on purchases. A negative number means you have GST credit."
          : "Net profit = paid sales + other income − paid purchases − expenses (salary, petrol, rent...). Add income and expenses under Income & Expenses."}
      </p>
    </div>
  );
}
