import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { CURRENCY_SYMBOLS } from "@/types/database";
import { amountToWordsINR } from "@/lib/amountToWords";
import { getPlanFeatures } from "@/lib/planFeatures";
import { hexToRgb, lighten, type RGB } from "@/lib/docDesign";
import type { DocTemplate } from "@/lib/docTemplates";
import type { ClassicArgs } from "@/lib/generateClassicPdf";

/**
 * A4 / A5 layouts for the ready-made templates. Every template is a different
 * arrangement of the same pieces (header, customer block, item table, totals,
 * footer), chosen in docTemplates.ts.
 */

const INK: RGB = [30, 30, 30];
const SOFT: RGB = [100, 100, 100];
const WHITE: RGB = [255, 255, 255];

function money(n: number, currency: string) {
  const f = n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "INR" ? `Rs. ${f}` : `${CURRENCY_SYMBOLS[currency] ?? `${currency} `}${f}`;
}
const num = (n: number) => Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtDate(v: string | null | undefined) {
  if (!v) return "";
  const d = new Date(v.length <= 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");

async function loadImage(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onloadend = () => res(fr.result as string);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type KV = [string, string];

export async function renderTemplatePdf(args: ClassicArgs, tpl: DocTemplate): Promise<Blob | void> {
  const {
    docLabel, docNumber, docDate, dueDate, status, paymentMethod, placeOfSupply, party, shipTo, items, subtotal,
    discountAmount = 0, gstEnabled, cgstAmount = 0, sgstAmount = 0, igstAmount = 0, roundOff = 0, total, notes,
    profile, filenamePrefix, paperSize, design, terms, signatureUrl, currency = "INR", bankDetails, qrUrl, preview, titleText,
  } = args;

  const plan = getPlanFeatures(profile.plan);
  const accent = hexToRgb(design.accentColor ?? tpl.accent);
  const tint = lighten(accent, 0.9);
  const mid = lighten(accent, 0.72);
  const showHsn = plan.gstBilling || Boolean(preview);
  const font = tpl.font;

  const s = paperSize === "a5" ? 0.75 : 1;
  const W = paperSize === "a5" ? 420 : 595;
  const H = paperSize === "a5" ? 595 : 842;
  const sideW = tpl.header === "sidebar" ? 150 * s : 0;
  const mx = 30 * s;
  const x0 = sideW ? sideW + 20 * s : mx;
  const x1 = W - mx;
  const innerW = x1 - x0;
  const topY = 30 * s;
  const bottomLimit = H - 30 * s;

  const base = Math.max(design.fontSize - (paperSize === "a5" ? 1 : 0), 7);
  const body = Math.max(base - 1, 7);
  const small = Math.max(base - 2, 6.5);
  const lh = (size: number) => size * 1.3;

  const doc = new jsPDF({ unit: "pt", format: [W, H] });
  const setFont = (w: "normal" | "bold" | "italic", size: number, color: RGB = INK) => {
    doc.setFont(font, w);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const text = (t: string, x: number, yy: number, opt?: Parameters<typeof doc.text>[3]) => doc.text(t, x, yy, opt);
  const wrap = (t: string, w: number): string[] => doc.splitTextToSize(t, w) as string[];

  // ---- Content ----------------------------------------------------------
  const title = titleText?.trim()
    ? titleText.trim().toUpperCase()
    : docLabel === "INVOICE" && gstEnabled
      ? "TAX INVOICE"
      : docLabel.toUpperCase();
  const numberLabel = docLabel === "INVOICE" ? "Invoice No." : `${cap(docLabel.toLowerCase())} No.`;

  const partyRows: KV[] = [["Name", party?.name ?? "Walk-in customer"]];
  if (party?.address) partyRows.push(["Address", party.address]);
  if (party?.phone) partyRows.push(["Phone", party.phone]);
  if (party?.email) partyRows.push(["Email", party.email]);
  if (gstEnabled || party?.gstin) partyRows.push(["GSTIN", party?.gstin || "-"]);
  if (placeOfSupply) partyRows.push(["Place of Supply", placeOfSupply]);
  if (shipTo && (shipTo.name || shipTo.address)) partyRows.push(["Ship To", [shipTo.name, shipTo.address].filter(Boolean).join(", ")]);

  const detailRows: KV[] = [[numberLabel, docNumber], ["Date", fmtDate(docDate)]];
  if (dueDate) detailRows.push([docLabel === "QUOTATION" ? "Valid Until" : "Due Date", fmtDate(dueDate)]);
  if (paymentMethod) detailRows.push(["Payment Mode", cap(paymentMethod)]);
  if (status) detailRows.push(["Status", cap(status)]);

  const contact: KV[] = [];
  if (profile.phone) contact.push(["Phone", profile.phone]);
  if (profile.gst_number) contact.push(["GSTIN", profile.gst_number]);
  const bizName = profile.business_name || "Your Business";
  const addr = [profile.address, profile.state].filter(Boolean).join(", ");

  let logoData: string | null = null;
  if (profile.logo_url) logoData = await loadImage(profile.logo_url);
  const logoBox = (maxW: number, maxH: number): { w: number; h: number } => {
    if (!logoData) return { w: 0, h: 0 };
    try {
      const p = doc.getImageProperties(logoData);
      const r = Math.min(maxW / p.width, maxH / p.height);
      return { w: p.width * r, h: p.height * r };
    } catch {
      logoData = null;
      return { w: 0, h: 0 };
    }
  };

  // ---- Page furniture ---------------------------------------------------
  function sidebar() {
    doc.setFillColor(...accent);
    doc.rect(0, 0, sideW, H, "F");
  }
  if (sideW) sidebar();
  let y = topY;
  function newPage() {
    doc.addPage([W, H]);
    if (sideW) sidebar();
    y = topY;
  }
  function need(h: number) {
    if (y + h > bottomLimit) newPage();
  }

  // ---- Header -----------------------------------------------------------
  const nameSize = base + 8;
  const titleSize = base + 8;
  const headerLine = (yy: number, w = 1.6) => {
    doc.setDrawColor(...accent);
    doc.setLineWidth(w);
    doc.line(x0, yy, x1, yy);
    doc.setLineWidth(0.6);
  };
  const metaRight = (yy: number, color: RGB, align = x1) => {
    detailRows.slice(0, 2).forEach(([l, v], i) => {
      setFont("normal", body, color);
      text(`${l}:  ${v}`, align, yy + i * lh(body), { align: "right" });
    });
    return yy + 2 * lh(body);
  };

  if (tpl.header === "left") {
    const lg = logoBox(90 * s, 52 * s);
    const nx = x0 + (lg.w ? lg.w + 14 * s : 0);
    const lines = wrap(bizName, x1 - 170 * s - nx);
    setFont("bold", nameSize, accent);
    const al = addr ? (setFont("normal", body), wrap(addr, x1 - 170 * s - nx)) : [];
    const hh = Math.max(lg.h, lines.length * lh(nameSize) + al.length * lh(body) + 2);
    if (logoData && lg.w) doc.addImage(logoData, x0, y + (hh - lg.h) / 2, lg.w, lg.h);
    let ty = y + nameSize * 0.85;
    setFont("bold", nameSize, accent);
    lines.forEach((l) => { text(l, nx, ty); ty += lh(nameSize); });
    setFont("normal", body, SOFT);
    al.forEach((l) => { text(l, nx, ty - 2); ty += lh(body); });
    let cy = y + body;
    contact.forEach(([l, v]) => {
      setFont("normal", body, INK);
      text(v, x1, cy, { align: "right" });
      setFont("bold", body, SOFT);
      text(`${l}:`, x1 - doc.getTextWidth(v) - 4, cy, { align: "right" });
      cy += lh(body);
    });
    y += hh + 8 * s;
    headerLine(y, 2.2);
    y += 12 * s;
    setFont("bold", base + 5, accent);
    text(title, x0, y + base + 3);
    y += lh(base + 5) + 8 * s;
  } else if (tpl.header === "center") {
    const lg = logoBox(80 * s, 46 * s);
    if (logoData && lg.w) { doc.addImage(logoData, W / 2 - lg.w / 2, y, lg.w, lg.h); y += lg.h + 6 * s; }
    setFont("bold", nameSize + 2, accent);
    wrap(bizName, innerW).forEach((l) => { y += lh(nameSize + 2) * 0.8; text(l, x0 + innerW / 2, y, { align: "center" }); y += lh(nameSize + 2) * 0.2; });
    setFont("normal", body, SOFT);
    if (addr) wrap(addr, innerW * 0.8).forEach((l) => { y += lh(body); text(l, x0 + innerW / 2, y, { align: "center" }); });
    if (contact.length) { y += lh(body); text(contact.map(([l, v]) => `${l}: ${v}`).join("     "), x0 + innerW / 2, y, { align: "center" }); }
    y += 10 * s;
    doc.setDrawColor(...accent);
    doc.setLineWidth(1.6);
    doc.line(x0, y, x1, y);
    doc.setLineWidth(0.5);
    doc.line(x0, y + 3 * s, x1, y + 3 * s);
    y += 14 * s;
    setFont("bold", base + 4, accent);
    text(title, x0 + innerW / 2, y + base, { align: "center" });
    y += lh(base + 4) + 8 * s;
  } else if (tpl.header === "band") {
    const lg = logoBox(80 * s, 46 * s);
    const nx = x0 + (lg.w ? lg.w + 14 * s : 0);
    const nameW = innerW * 0.55 - (lg.w ? lg.w + 14 * s : 0);
    const lines = wrap(bizName, nameW);
    setFont("normal", body);
    const al = addr ? wrap(addr, nameW) : [];
    const textH = lines.length * lh(nameSize) + al.length * lh(body) + (contact.length ? lh(body) : 0);
    const bandH = Math.max(textH, lg.h) + 30 * s;
    doc.setFillColor(...accent);
    doc.rect(0, 0, W, bandH, "F");
    if (logoData && lg.w) doc.addImage(logoData, x0, (bandH - lg.h) / 2, lg.w, lg.h);
    let ty = (bandH - textH) / 2 + nameSize * 0.85;
    setFont("bold", nameSize, WHITE);
    lines.forEach((l) => { text(l, nx, ty); ty += lh(nameSize); });
    setFont("normal", body, WHITE);
    al.forEach((l) => { text(l, nx, ty - 2); ty += lh(body); });
    if (contact.length) text(contact.map(([l, v]) => `${l}: ${v}`).join("   "), nx, ty - 2);
    setFont("bold", titleSize, WHITE);
    text(title, x1, bandH / 2 - 2, { align: "right" });
    setFont("normal", body, WHITE);
    text(`${docNumber}  |  ${fmtDate(docDate)}`, x1, bandH / 2 + lh(body), { align: "right" });
    y = bandH + 16 * s;
  } else if (tpl.header === "split") {
    const lg = logoBox(80 * s, 46 * s);
    const nx = x0 + (lg.w ? lg.w + 12 * s : 0);
    const nameW = innerW * 0.5 - (lg.w ? lg.w + 12 * s : 0);
    const lines = wrap(bizName, nameW);
    setFont("normal", body);
    const al = addr ? wrap(addr, nameW) : [];
    if (logoData && lg.w) doc.addImage(logoData, x0, y, lg.w, lg.h);
    let ty = y + base + 2;
    setFont("bold", base + 4, INK);
    lines.forEach((l) => { text(l, nx, ty); ty += lh(base + 4); });
    setFont("normal", body, SOFT);
    al.forEach((l) => { text(l, nx, ty - 2); ty += lh(body); });
    contact.forEach(([l, v]) => { text(`${l}: ${v}`, nx, ty - 2); ty += lh(body); });
    setFont("bold", titleSize + 4, accent);
    text(title, x1, y + titleSize + 2, { align: "right" });
    const my = metaRight(y + titleSize + 2 + lh(body) + 4 * s, INK);
    y = Math.max(ty, my, y + lg.h) + 6 * s;
    headerLine(y, 3);
    y += 14 * s;
  } else if (tpl.header === "sidebar") {
    const inner = sideW - 28 * s;
    let sy = topY + 4 * s;
    const lg = logoBox(inner, 56 * s);
    if (logoData && lg.w) { doc.addImage(logoData, 14 * s, sy, lg.w, lg.h); sy += lg.h + 10 * s; }
    setFont("bold", base + 3, WHITE);
    wrap(bizName, inner).forEach((l) => { sy += lh(base + 3) * 0.85; text(l, 14 * s, sy); sy += lh(base + 3) * 0.15; });
    sy += 6 * s;
    setFont("normal", body, WHITE);
    if (addr) wrap(addr, inner).forEach((l) => { sy += lh(body); text(l, 14 * s, sy); });
    sy += 8 * s;
    contact.forEach(([l, v]) => {
      setFont("bold", small, WHITE);
      sy += lh(small);
      text(l.toUpperCase(), 14 * s, sy);
      setFont("normal", body, WHITE);
      sy += lh(body);
      wrap(v, inner).forEach((t, i) => text(t, 14 * s, sy + i * lh(body)));
    });
    setFont("bold", titleSize + 2, accent);
    text(title, x0, y + titleSize, { align: "left" });
    setFont("normal", body, SOFT);
    const mY = y + titleSize + lh(body);
    text(`${numberLabel}  ${docNumber}`, x0, mY);
    text(`Date  ${fmtDate(docDate)}`, x0, mY + lh(body));
    y = mY + lh(body) + 8 * s;
    headerLine(y, 1.6);
    y += 14 * s;
  } else {
    // minimal
    const lg = logoBox(70 * s, 40 * s);
    if (logoData && lg.w) doc.addImage(logoData, x0, y, lg.w, lg.h);
    const nx = x0 + (lg.w ? lg.w + 12 * s : 0);
    setFont("bold", nameSize, accent);
    let ty = y + nameSize * 0.85;
    wrap(bizName, innerW * 0.55 - (nx - x0)).forEach((l) => { text(l, nx, ty); ty += lh(nameSize); });
    setFont("normal", body, SOFT);
    if (addr) wrap(addr, innerW * 0.55 - (nx - x0)).forEach((l) => { text(l, nx, ty - 2); ty += lh(body); });
    contact.forEach(([l, v]) => { text(`${l}: ${v}`, nx, ty - 2); ty += lh(body); });
    setFont("bold", base + 6, SOFT);
    text(title, x1, y + base + 4, { align: "right" });
    const my = metaRight(y + base + 4 + lh(body) + 2 * s, SOFT);
    y = Math.max(ty, my, y + lg.h) + 12 * s;
  }

  // ---- Customer + document details --------------------------------------
  const labelWidth = (rows: KV[], w: number) => {
    setFont("bold", body, SOFT);
    return Math.min(Math.max(0, ...rows.map(([l]) => doc.getTextWidth(l))) + 8 * s, w * 0.5);
  };
  const kvHeight = (rows: KV[], w: number, _labelW?: number) => {
    const lw = labelWidth(rows, w);
    setFont("normal", body, INK);
    return rows.reduce((a, [, v]) => a + Math.max(1, wrap(v, w - lw).length) * lh(body) + 2 * s, 0);
  };
  const drawKV = (rows: KV[], x: number, yy: number, w: number, _labelW?: number) => {
    const labelW = labelWidth(rows, w);
    let cy = yy;
    rows.forEach(([l, v]) => {
      setFont("bold", body, SOFT);
      text(l, x, cy);
      setFont("normal", body, INK);
      const ls = wrap(v, w - labelW);
      ls.forEach((t, i) => text(t, x + labelW, cy + i * lh(body)));
      cy += Math.max(1, ls.length) * lh(body) + 2 * s;
    });
    return cy;
  };
  setFont("normal", body);
  // Details already shown in the header for these; list the rest on the right.
  const rightRows: KV[] = tpl.header === "split" || tpl.header === "minimal" || tpl.header === "band" || tpl.header === "sidebar" ? detailRows.slice(2) : detailRows;
  const labelW = 62 * s;

  if (tpl.parties === "cards") {
    const gap = 10 * s;
    const cw = (innerW - gap) / 2;
    const left = kvHeight(partyRows, cw - 20 * s, labelW);
    const rows = rightRows.length ? rightRows : detailRows;
    const right = kvHeight(rows, cw - 20 * s, labelW);
    const h = Math.max(left, right) + 34 * s;
    need(h + 80 * s);
    [[x0, "BILL TO", partyRows], [x0 + cw + gap, tpl.header === "band" || tpl.header === "minimal" ? "MORE DETAILS" : "DETAILS", rows]].forEach(([x, label, r]) => {
      doc.setFillColor(...tint);
      doc.setDrawColor(...mid);
      doc.roundedRect(x as number, y, cw, h, 5 * s, 5 * s, "FD");
      setFont("bold", small, accent);
      text(label as string, (x as number) + 10 * s, y + 14 * s);
      drawKV(r as KV[], (x as number) + 10 * s, y + 28 * s, cw - 20 * s, labelW);
    });
    y += h + 12 * s;
  } else if (tpl.parties === "bar") {
    const gap = 16 * s;
    const cw = (innerW - gap) / 2;
    const rows = rightRows.length ? rightRows : detailRows;
    const h = Math.max(kvHeight(partyRows, cw, labelW), kvHeight(rows, cw, labelW)) + 26 * s;
    need(h + 80 * s);
    [[x0, "BILL TO", partyRows], [x0 + cw + gap, "DETAILS", rows]].forEach(([x, label, r]) => {
      doc.setFillColor(...accent);
      doc.rect(x as number, y, cw, 16 * s, "F");
      setFont("bold", small + 0.5, WHITE);
      text(label as string, (x as number) + 8 * s, y + 11 * s);
      drawKV(r as KV[], (x as number) + 4 * s, y + 28 * s, cw - 4 * s, labelW);
    });
    y += h + 8 * s;
  } else if (tpl.parties === "table") {
    const lw = innerW * 0.5;
    const rows = detailRows;
    const h = Math.max(kvHeight(partyRows, lw - 16 * s, labelW), kvHeight(rows, innerW - lw - 16 * s, labelW)) + 26 * s;
    need(h + 80 * s);
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.8);
    doc.rect(x0, y, innerW, h);
    doc.line(x0 + lw, y, x0 + lw, y + h);
    doc.setFillColor(...tint);
    doc.rect(x0, y, lw, 16 * s, "FD");
    doc.rect(x0 + lw, y, innerW - lw, 16 * s, "FD");
    setFont("bold", small + 0.5, accent);
    text("Customer Detail", x0 + 8 * s, y + 11 * s);
    text("Document Detail", x0 + lw + 8 * s, y + 11 * s);
    drawKV(partyRows, x0 + 8 * s, y + 28 * s, lw - 16 * s, labelW);
    drawKV(rows, x0 + lw + 8 * s, y + 28 * s, innerW - lw - 16 * s, labelW);
    y += h;
  } else if (tpl.parties === "stacked") {
    const lw = innerW * 0.55;
    const rows = rightRows;
    const h = Math.max(kvHeight(partyRows, lw, labelW), rows.length ? kvHeight(rows, innerW - lw - 10 * s, labelW) : 0) + 20 * s;
    need(h + 80 * s);
    setFont("bold", small + 0.5, accent);
    text("BILLED TO", x0, y + 8 * s);
    drawKV(partyRows, x0, y + 22 * s, lw, labelW);
    if (rows.length) {
      setFont("bold", small + 0.5, accent);
      text("DETAILS", x0 + lw + 10 * s, y + 8 * s);
      drawKV(rows, x0 + lw + 10 * s, y + 22 * s, innerW - lw - 10 * s, 56 * s);
    }
    y += h;
    doc.setDrawColor(...mid);
    doc.setLineWidth(0.6);
    doc.line(x0, y, x1, y);
    y += 8 * s;
  } else {
    // inline: one compact strip
    const line1 = `Bill to: ${party?.name ?? "Walk-in customer"}${party?.phone ? `  |  ${party.phone}` : ""}${party?.gstin ? `  |  GSTIN ${party.gstin}` : ""}`;
    const l1 = wrap(line1, innerW * 0.6);
    const extra = [party?.address, placeOfSupply ? `Place of Supply: ${placeOfSupply}` : null, shipTo?.address ? `Ship to: ${shipTo.address}` : null].filter(Boolean).join("  |  ");
    const l2 = extra ? wrap(extra, innerW * 0.6) : [];
    const rows = rightRows;
    const h = Math.max((l1.length + l2.length) * lh(body), rows.length * lh(body)) + 14 * s;
    need(h + 80 * s);
    doc.setFillColor(...tint);
    doc.rect(x0, y, innerW, h, "F");
    doc.setFillColor(...accent);
    doc.rect(x0, y, 3 * s, h, "F");
    let cy = y + 12 * s;
    setFont("bold", body, INK);
    l1.forEach((l) => { text(l, x0 + 10 * s, cy); cy += lh(body); });
    setFont("normal", body, SOFT);
    l2.forEach((l) => { text(l, x0 + 10 * s, cy); cy += lh(body); });
    cy = y + 12 * s;
    rows.forEach(([l, v]) => {
      setFont("normal", body, SOFT);
      text(`${l}:`, x1 - 100 * s, cy, { align: "right" });
      setFont("bold", body, INK);
      text(v, x1 - 94 * s, cy);
      cy += lh(body);
    });
    y += h + 6 * s;
  }

  // ---- Item table ---------------------------------------------------------
  const head = ["#", "Description", ...(showHsn ? ["HSN"] : []), "Qty", "Rate", "Amount"];
  const rowsData = items.map((it, i) => [
    String(i + 1),
    it.item_code ? `${it.description}\n(${it.item_code})` : it.description,
    ...(showHsn ? [it.hsn_code ?? ""] : []),
    Number(it.quantity).toLocaleString("en-IN", { maximumFractionDigits: 3 }) + (it.unit ? ` ${it.unit}` : ""),
    num(it.unit_price),
    num(it.line_total),
  ]);
  const lastCol = head.length - 1;
  const solidHead = tpl.table === "solid" || tpl.table === "zebra";
  const colStyles: Record<number, object> = { 0: { cellWidth: 26 * s, halign: "center" } };
  colStyles[head.length - 3] = { halign: "right" };
  colStyles[head.length - 2] = { halign: "right" };
  colStyles[lastCol] = { halign: "right" };
  if (showHsn) colStyles[2] = { halign: "center", cellWidth: 54 * s };

  need(60 * s);
  autoTable(doc, {
    startY: y,
    margin: { left: x0, right: W - x1, top: topY, bottom: H - bottomLimit },
    head: [head],
    body: rowsData,
    theme: "plain",
    tableWidth: innerW,
    styles: {
      font,
      fontSize: body,
      textColor: INK,
      cellPadding: { top: 4.5 * s, bottom: 4.5 * s, left: 5 * s, right: 5 * s },
      lineWidth: 0,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: solidHead ? accent : tpl.table === "grid" ? tint : [255, 255, 255],
      textColor: solidHead ? WHITE : tpl.table === "minimal" ? SOFT : accent,
      fontStyle: "bold",
      halign: "center",
      fontSize: tpl.table === "minimal" ? small + 0.5 : body,
    },
    alternateRowStyles: tpl.table === "zebra" ? { fillColor: tint } : {},
    columnStyles: colStyles,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    didDrawCell: (d) => {
      const c = d.cell;
      doc.setLineWidth(0.5);
      if (tpl.table === "grid") {
        doc.setDrawColor(...accent);
        doc.rect(c.x, c.y, c.width, c.height);
      } else if (tpl.table === "lines") {
        doc.setDrawColor(...(d.section === "head" ? accent : mid));
        doc.setLineWidth(d.section === "head" ? 1.4 : 0.4);
        doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height);
      } else if (tpl.table === "minimal") {
        doc.setDrawColor(...((d.section === "head" ? accent : [225, 225, 225]) as RGB));
        doc.setLineWidth(d.section === "head" ? 1 : 0.4);
        doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height);
      } else if (tpl.table === "solid") {
        doc.setDrawColor(...mid);
        doc.line(c.x, c.y + c.height, c.x + c.width, c.y + c.height);
      }
    },
    didDrawPage: () => {
      if (sideW && doc.getCurrentPageInfo().pageNumber > 1) sidebar();
    },
  });
  // @ts-expect-error - lastAutoTable is added by the plugin at runtime
  y = doc.lastAutoTable.finalY + 12 * s;

  // ---- Totals ---------------------------------------------------------------
  const taxRows: KV[] = [];
  const breakdown = discountAmount > 0 || cgstAmount > 0 || sgstAmount > 0 || igstAmount > 0 || roundOff !== 0;
  if (breakdown) taxRows.push(["Subtotal", money(subtotal + discountAmount, currency)]);
  if (discountAmount > 0) taxRows.push(["Discount", `-${money(discountAmount, currency)}`]);
  if (cgstAmount > 0) taxRows.push(["CGST", money(cgstAmount, currency)]);
  if (sgstAmount > 0) taxRows.push(["SGST", money(sgstAmount, currency)]);
  if (igstAmount > 0) taxRows.push(["IGST", money(igstAmount, currency)]);
  if (roundOff !== 0) taxRows.push(["Round Off", roundOff < 0 ? `-${money(Math.abs(roundOff), currency)}` : money(roundOff, currency)]);
  const words = currency === "INR" ? amountToWordsINR(total) : "";
  const stackW = tpl.totals === "bar" ? innerW * 0.45 : innerW * 0.46;
  const stackX = x1 - stackW;
  const rowH = 15 * s;
  const barH = 24 * s;
  const wordsLines = words ? wrap(words, innerW - stackW - 20 * s) : [];

  const fitAmount = (label: string, labelSize: number, start: number, avail: number) => {
    const amt = money(total, currency);
    let sz = start;
    while (sz > 7) {
      setFont("bold", labelSize, INK);
      const lw = doc.getTextWidth(label);
      setFont("bold", sz, INK);
      if (lw + doc.getTextWidth(amt) + 16 * s <= avail) break;
      sz -= 0.5;
    }
    return sz;
  };
  const stackH = taxRows.length * rowH + (tpl.totals === "bar" ? 0 : barH + 6 * s);
  need(Math.max(stackH, wordsLines.length * lh(body) + 20 * s) + (tpl.totals === "bar" ? barH + 8 * s : 0) + 20 * s);
  let ty = y;
  taxRows.forEach(([l, v]) => {
    setFont("normal", body, SOFT);
    text(l, stackX, ty + 10 * s);
    setFont("normal", body, INK);
    text(v, x1, ty + 10 * s, { align: "right" });
    ty += rowH;
  });
  if (words) {
    setFont("bold", small, accent);
    text("AMOUNT IN WORDS", x0, y + 10 * s);
    setFont("italic", body, INK);
    wordsLines.forEach((l, i) => text(l, x0, y + 10 * s + lh(body) * (i + 1)));
  }
  if (tpl.totals === "box") {
    doc.setFillColor(...accent);
    doc.roundedRect(stackX, ty + 4 * s, stackW, barH, 4 * s, 4 * s, "F");
    setFont("bold", base, WHITE);
    text("Total", stackX + 10 * s, ty + 4 * s + barH / 2 + base * 0.35);
    const bs = fitAmount("Total", base, base + 3, stackW);
    setFont("bold", bs, WHITE);
    text(money(total, currency), x1 - 10 * s, ty + 4 * s + barH / 2 + bs * 0.35, { align: "right" });
    y = Math.max(ty + barH + 10 * s, y + wordsLines.length * lh(body) + 22 * s);
  } else if (tpl.totals === "bar") {
    y = Math.max(ty, y + (words ? wordsLines.length * lh(body) + 14 * s : 0)) + 4 * s;
    doc.setFillColor(...accent);
    doc.rect(x0, y, innerW, barH, "F");
    setFont("bold", base + 1, WHITE);
    text("Total Amount", x0 + 10 * s, y + barH / 2 + base * 0.4);
    const bs = fitAmount("Total Amount", base + 1, base + 4, innerW);
    setFont("bold", bs, WHITE);
    text(money(total, currency), x1 - 10 * s, y + barH / 2 + bs * 0.35, { align: "right" });
    y += barH + 12 * s;
  } else {
    doc.setDrawColor(...accent);
    doc.setLineWidth(1.2);
    doc.line(stackX, ty + 2 * s, x1, ty + 2 * s);
    setFont("bold", base, INK);
    text("Total", stackX, ty + 18 * s);
    const ps = fitAmount("Total", base, base + 5, stackW);
    setFont("bold", ps, accent);
    text(money(total, currency), x1, ty + 20 * s, { align: "right" });
    y = Math.max(ty + 32 * s, y + wordsLines.length * lh(body) + 22 * s);
  }

  // ---- Footer: bank, QR, signature ------------------------------------------
  const bankRows: KV[] = [];
  if (bankDetails?.bankName) bankRows.push(["Bank", bankDetails.bankName]);
  if (bankDetails?.accountName) bankRows.push(["A/c Name", bankDetails.accountName]);
  if (bankDetails?.accountNumber) bankRows.push(["A/c No.", bankDetails.accountNumber]);
  if (bankDetails?.ifscOrSwift) bankRows.push(["IFSC", bankDetails.ifscOrSwift]);
  if (bankDetails?.upiId) bankRows.push(["UPI", bankDetails.upiId]);
  const qrData = qrUrl ? await loadImage(qrUrl) : null;
  const sigData = signatureUrl ? await loadImage(signatureUrl) : null;
  const qrSize = 68 * s;
  setFont("bold", body, INK);
  const fh = Math.max(bankRows.length * 15 * s + 26 * s, qrData ? qrSize + 26 * s : 0, 86 * s) + (wrap(`For ${bizName}`, 100 * s).length - 1) * lh(body);

  const drawQr = (x: number, yy: number) => {
    if (!qrData) return;
    try { doc.addImage(qrData, x, yy, qrSize, qrSize); } catch { /* skip unreadable image */ }
  };
  const drawSign = (cx: number, yy: number, w: number) => {
    setFont("bold", body, INK);
    const forLines = wrap(`For ${bizName}`, w - 12 * s);
    forLines.forEach((l, i) => text(l, cx, yy + i * lh(body), { align: "center" }));
    yy += (forLines.length - 1) * lh(body);
    if (sigData) {
      try {
        const p = doc.getImageProperties(sigData);
        const r = Math.min((110 * s) / p.width, (40 * s) / p.height);
        doc.addImage(sigData, cx - (p.width * r) / 2, yy + 6 * s, p.width * r, p.height * r);
      } catch { /* skip unreadable image */ }
    }
    doc.setDrawColor(...SOFT);
    doc.setLineWidth(0.5);
    doc.line(cx - w / 2 + 8 * s, yy + 52 * s, cx + w / 2 - 8 * s, yy + 52 * s);
    setFont("normal", small, SOFT);
    text("Authorised Signatory", cx, yy + 62 * s, { align: "center" });
  };

  need(fh + 10 * s);
  if (tpl.footer === "boxed") {
    const bw = bankRows.length || qrData ? innerW * 0.58 : 0;
    if (bw) {
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.8);
      doc.rect(x0, y, bw, fh);
      doc.setFillColor(...tint);
      doc.rect(x0, y, bw, 16 * s, "FD");
      setFont("bold", small + 0.5, accent);
      text("Bank Details", x0 + 8 * s, y + 11 * s);
      let by = y + 30 * s;
      bankRows.forEach(([l, v]) => { setFont("normal", body, SOFT); text(l, x0 + 8 * s, by); setFont("normal", body, INK); text(v, x0 + 62 * s, by, { maxWidth: bw - 70 * s - (qrData ? qrSize : 0) }); by += 15 * s; });
      drawQr(x0 + bw - qrSize - 8 * s, y + 24 * s);
    }
    const sx = x0 + bw;
    doc.setDrawColor(...accent);
    doc.rect(sx, y, innerW - bw, fh);
    drawSign(sx + (innerW - bw) / 2, y + 24 * s, innerW - bw);
  } else if (tpl.footer === "three") {
    const cw = innerW / 3;
    setFont("bold", small + 0.5, accent);
    text("BANK DETAILS", x0, y + 8 * s);
    doc.setDrawColor(...accent);
    doc.setLineWidth(1);
    doc.line(x0, y + 12 * s, x0 + cw - 12 * s, y + 12 * s);
    let by = y + 26 * s;
    bankRows.forEach(([l, v]) => { setFont("normal", body, SOFT); text(l, x0, by); setFont("normal", body, INK); text(v, x0 + 50 * s, by, { maxWidth: cw - 60 * s }); by += 15 * s; });
    if (qrData) {
      setFont("bold", small + 0.5, accent);
      text("SCAN TO PAY", x0 + cw, y + 8 * s);
      doc.line(x0 + cw, y + 12 * s, x0 + 2 * cw - 12 * s, y + 12 * s);
      drawQr(x0 + cw, y + 20 * s);
    }
    drawSign(x0 + 2.5 * cw - 6 * s, y + 24 * s, cw - 6 * s);
  } else {
    // stacked: payment strip, then signature on the right
    if (bankRows.length || qrData) {
      const sh = Math.max(bankRows.length * 14 * s + 14 * s, qrData ? qrSize + 12 * s : 0);
      doc.setFillColor(...tint);
      doc.rect(x0, y, innerW, sh, "F");
      setFont("bold", small + 0.5, accent);
      text("PAYMENT DETAILS", x0 + 10 * s, y + 12 * s);
      let by = y + 26 * s;
      bankRows.forEach(([l, v]) => { setFont("normal", body, SOFT); text(l, x0 + 10 * s, by); setFont("normal", body, INK); text(v, x0 + 70 * s, by); by += 14 * s; });
      drawQr(x1 - qrSize - 10 * s, y + 6 * s);
      y += sh + 10 * s;
    }
    need(76 * s);
    drawSign(x1 - 80 * s, y + 10 * s, 160 * s);
    y += 10 * s;
  }
  y += fh > 0 && tpl.footer !== "stacked" ? fh + 10 * s : 74 * s;

  // ---- Notes + terms ----------------------------------------------------------
  const block = (label: string, content: string) => {
    const ls = wrap(content, innerW - 4 * s);
    const h = 16 * s + ls.length * lh(small + 0.5) + 6 * s;
    need(h);
    setFont("bold", small + 0.5, accent);
    text(label.toUpperCase(), x0, y + 10 * s);
    setFont("normal", small + 0.5, INK);
    ls.forEach((l, i) => text(l, x0, y + 22 * s + i * lh(small + 0.5)));
    y += h;
  };
  if (notes) block("Notes", notes);
  if (terms) block("Terms & Conditions", terms);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (plan.invoiceWatermark) {
      setFont("bold", small + 1, [150, 150, 150]);
      text("Generated by Zen Biz", x0 + innerW / 2, H - 14 * s, { align: "center" });
    }
    if (pages > 1) {
      setFont("normal", small, SOFT);
      text(`Page ${p} of ${pages}`, x1, H - 14 * s, { align: "right" });
    }
  }

  if (preview) return doc.output("blob");
  doc.save(`${filenamePrefix}-${docNumber}.pdf`);
}
