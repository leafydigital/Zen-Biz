import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DocDesignSettings, Profile } from "@/types/database";
import { CURRENCY_SYMBOLS } from "@/types/database";
import { amountToWordsINR } from "@/lib/amountToWords";
import { getPlanFeatures } from "@/lib/planFeatures";
import { customOptions, hexToRgb, lighten, normalizeStyle, type RGB } from "@/lib/docDesign";

/**
 * The boxed "tax invoice" layout used for A4 / A5 documents (Simple,
 * Colourful and Custom styles). Same inputs as the old standard layout, so
 * invoices, quotations, purchases and billing records all use it.
 */

export interface ClassicLineItem {
  description: string;
  quantity: number;
  unit: string;
  item_code?: string | null;
  hsn_code?: string | null;
  unit_price: number;
  tax_percent?: number;
  line_total: number;
}

export interface ClassicParty {
  name: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  gstin?: string | null;
}

export interface ClassicArgs {
  docLabel: string;
  docNumber: string;
  docDate: string;
  dueDate?: string | null;
  status?: string;
  paymentMethod?: string | null;
  taxType?: string;
  placeOfSupply?: string | null;
  partyLabel: string;
  party: ClassicParty | null;
  shipTo?: { name?: string | null; address?: string | null } | null;
  items: ClassicLineItem[];
  subtotal: number;
  discountAmount?: number;
  gstEnabled: boolean;
  gstPercent: number;
  gstAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  roundOff?: number;
  total: number;
  notes?: string | null;
  profile: Profile;
  filenamePrefix: string;
  paperSize: "a4" | "a5";
  design: DocDesignSettings;
  terms?: string | null;
  signatureUrl?: string | null;
  currency?: string;
  bankDetails?: {
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    ifscOrSwift?: string | null;
    upiId?: string | null;
  } | null;
  qrUrl?: string | null;
  /** Preview mode: ignore plan limits on styles and return the PDF instead of saving it. */
  preview?: boolean;
  titleText?: string | null;
}

function money(n: number, currency: string) {
  const formatted = n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (currency === "INR") return `Rs. ${formatted}`;
  return `${CURRENCY_SYMBOLS[currency] ?? `${currency} `}${formatted}`;
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function fmtDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

function cap(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, " ");
}

export async function renderClassicPdf(args: ClassicArgs): Promise<Blob | void> {
  const {
    docLabel, docNumber, docDate, dueDate, status, paymentMethod, placeOfSupply,
    party, shipTo, items, subtotal, discountAmount = 0, gstEnabled,
    cgstAmount = 0, sgstAmount = 0, igstAmount = 0, roundOff = 0, total,
    notes, profile, filenamePrefix, paperSize, design, terms, signatureUrl,
    currency = "INR", bankDetails, qrUrl, preview, titleText,
  } = args;

  // ---- Style → colours + switches -------------------------------------
  const plan = getPlanFeatures(profile.plan);
  let style = normalizeStyle(design.style);
  if (style !== "simple" && !plan.colourfulStyles && !preview) style = "simple";
  const opts = customOptions(design);
  const isSimple = style === "simple";
  const isCustom = style === "custom";

  const ink: RGB = [30, 30, 30];
  const soft: RGB = [90, 90, 90];
  const accent: RGB = isSimple ? [30, 30, 30] : hexToRgb(design.accentColor);
  const lineColor: RGB = isSimple ? [60, 60, 60] : accent;
  const tintOn = isSimple ? true : isCustom ? opts.tintTable : true;
  const headTint: RGB = isSimple ? [240, 240, 240] : lighten(accent, 0.88);
  const colTint: RGB = isSimple ? [248, 248, 248] : lighten(accent, 0.93);
  const font = isCustom ? opts.fontFamily : "helvetica";

  const showLogo = !isCustom || opts.showLogo;
  const showHsn = (isCustom ? opts.showHsn : true) && (plan.gstBilling || Boolean(preview));
  const showBank = !isCustom || opts.showBank;
  const showQr = !isCustom || opts.showQr;
  const showSignature = !isCustom || opts.showSignature;
  const showNotes = !isCustom || opts.showNotes;
  const showTerms = !isCustom || opts.showTerms;

  // ---- Page geometry --------------------------------------------------
  const s = paperSize === "a5" ? 0.75 : 1;
  const W = paperSize === "a5" ? 420 : 595;
  const H = paperSize === "a5" ? 595 : 842;
  const mx = 28 * s;
  const x0 = mx;
  const x1 = W - mx;
  const innerW = x1 - x0;
  const bottomLimit = H - 26 * s;
  const topY = 28 * s;

  const base = Math.max(design.fontSize - (paperSize === "a5" ? 1 : 0), 7);
  const body = Math.max(base - 1, 7);
  const small = Math.max(base - 2, 6.5);

  // Separate size adjustments (paid plans only).
  const sizesAllowed = plan.colourfulStyles || Boolean(preview);
  const sz = sizesAllowed ? design.sizes ?? {} : {};
  const hName = sz.headerName ?? base + 7;
  const hDetail = sz.headerDetails ?? body;
  const logoScale = (sz.logoPercent ?? 100) / 100;
  const tableSize = sz.tableText ?? body;
  const totalSize = sz.totalAmount ?? base + 3;

  const doc = new jsPDF({ unit: "pt", format: [W, H] });
  doc.setLineWidth(0.7);

  const setFont = (weight: "normal" | "bold" | "italic", size: number, color: RGB = ink) => {
    doc.setFont(font, weight);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const lineH = (size: number) => size * 1.28;

  function newPage(): number {
    doc.addPage([W, H]);
    return topY;
  }
  let y = topY;
  function need(h: number) {
    if (y + h > bottomLimit) y = newPage();
  }

  // ---- Header: logo | name + address | contact -------------------------
  let logoW = 0;
  let logoH = 0;
  let logoData: string | null = null;
  if (showLogo && profile.logo_url) {
    logoData = await loadImage(profile.logo_url);
    if (logoData) {
      try {
        const props = doc.getImageProperties(logoData);
        const maxW = 100 * s * logoScale;
        const maxH = 56 * s * logoScale;
        const ratio = Math.min(maxW / props.width, maxH / props.height);
        logoW = props.width * ratio;
        logoH = props.height * ratio;
      } catch {
        logoData = null;
      }
    }
  }

  const nameX = x0 + (logoData ? logoW + 16 * s : 0);
  const rightColW = 150 * s;
  const nameColW = x1 - rightColW - 10 * s - nameX;

  setFont("bold", hName, ink);
  const nameLines: string[] = doc.splitTextToSize(profile.business_name || "Your Business", nameColW);
  setFont("normal", hDetail, ink);
  const addrLines: string[] = profile.address ? doc.splitTextToSize(profile.address, nameColW) : [];
  const stateLine = profile.state ? [profile.state] : [];
  const leftBlockH =
    nameLines.length * lineH(hName) + (addrLines.length + stateLine.length) * lineH(hDetail) + 4 * s;

  const contact: [string, string][] = [];
  if (profile.phone) contact.push(["Phone", profile.phone]);
  if (profile.gst_number) contact.push(["GSTIN", profile.gst_number]);
  const rightBlockH = contact.length * lineH(hDetail);

  const headerH = Math.max(logoH, leftBlockH, rightBlockH);

  if (logoData) {
    doc.addImage(logoData, x0, y + (headerH - logoH) / 2, logoW, logoH);
  }
  let ty = y + (hName) * 0.85;
  setFont("bold", hName, ink);
  nameLines.forEach((line) => {
    doc.text(line, nameX, ty);
    ty += lineH(hName);
  });
  setFont("normal", hDetail, ink);
  [...addrLines, ...stateLine].forEach((line) => {
    doc.text(line, nameX, ty - 2 * s);
    ty += lineH(hDetail);
  });

  let cy = y + hDetail * 0.95;
  contact.forEach(([label, value]) => {
    setFont("normal", hDetail, ink);
    const vw = doc.getTextWidth(value);
    doc.text(value, x1, cy, { align: "right" });
    setFont("bold", hDetail, ink);
    doc.text(`${label} :`, x1 - vw - 4 * s, cy, { align: "right" });
    cy += lineH(hDetail);
  });

  y += headerH + 14 * s;

  // ---- Title row --------------------------------------------------------
  const rowPad = 6 * s;
  const titleH = 24 * s;
  need(titleH + 60 * s);
  doc.setDrawColor(...lineColor);
  doc.rect(x0, y, innerW, titleH);
  const title = titleText?.trim()
    ? titleText.trim().toUpperCase()
    : docLabel === "INVOICE" && gstEnabled
      ? "TAX INVOICE"
      : docLabel.toUpperCase();
  setFont("bold", base + 5, isSimple ? ink : accent);
  doc.text(title, x0 + 10 * s, y + titleH / 2 + (base + 5) * 0.35);
  if (gstEnabled && docLabel === "INVOICE") {
    setFont("bold", small, ink);
    doc.text("ORIGINAL FOR RECIPIENT", x1 - 10 * s, y + titleH / 2 + small * 0.35, { align: "right" });
  }
  y += titleH;

  // ---- Info row: customer (left) | document details (right) ------------
  const leftW = innerW * 0.46;
  const labelW = 60 * s;
  const custHeadH = 17 * s;

  type Row = [string, string];
  const custRows: Row[] = [];
  custRows.push(["Name", party?.name ?? "Walk-in customer"]);
  if (party?.address) custRows.push(["Address", party.address]);
  if (party?.phone) custRows.push(["Phone", party.phone]);
  if (party?.email) custRows.push(["Email", party.email]);
  if (gstEnabled || party?.gstin) custRows.push(["GSTIN", party?.gstin || "-"]);
  if (placeOfSupply) custRows.push(["Place of Supply", placeOfSupply]);
  if (shipTo && (shipTo.name || shipTo.address)) {
    custRows.push(["Ship To", [shipTo.name, shipTo.address].filter(Boolean).join(", ")]);
  }

  setFont("normal", body, ink);
  const custValW = leftW - labelW - 14 * s;
  const custWrapped = custRows.map(([label, value]) => {
    const lines = doc.splitTextToSize(value, custValW) as string[];
    const labelLines = doc.splitTextToSize(label, labelW - 4 * s) as string[];
    return { labelLines, lines, count: Math.max(lines.length, labelLines.length) };
  });
  const custH =
    custHeadH + custWrapped.reduce((sum, r) => sum + r.count * lineH(body) + 3 * s, 0) + rowPad + 4 * s;

  const detailRows: Row[] = [];
  detailRows.push([docLabel === "INVOICE" ? "Invoice No." : `${cap(docLabel.toLowerCase())} No.`, docNumber]);
  detailRows.push([docLabel === "INVOICE" ? "Invoice Date" : "Date", fmtDate(docDate)]);
  if (dueDate) detailRows.push([docLabel === "QUOTATION" ? "Valid Until" : "Due Date", fmtDate(dueDate)]);
  if (paymentMethod) detailRows.push(["Payment Mode", cap(paymentMethod)]);
  if (status) detailRows.push(["Status", cap(status)]);

  const rightX0 = x0 + leftW;
  const rightW = innerW - leftW;
  const colW = rightW / 2;
  const detailLineH = 29 * s;
  const detailRowsPaired = Math.ceil(detailRows.length / 2);
  const detailsH = detailRowsPaired * detailLineH + 2 * rowPad;

  const infoH = Math.max(custH, detailsH, 56 * s);
  need(infoH + 90 * s);
  doc.setDrawColor(...lineColor);
  doc.rect(x0, y, innerW, infoH);
  doc.line(rightX0, y, rightX0, y + infoH);

  // Left: header band + rows
  if (tintOn) {
    doc.setFillColor(...headTint);
    doc.rect(x0, y, leftW, custHeadH, "F");
    doc.rect(x0, y, leftW, custHeadH);
  } else {
    doc.line(x0, y + custHeadH, x0 + leftW, y + custHeadH);
  }
  setFont("bold", body, ink);
  doc.text("Customer Detail", x0 + leftW / 2, y + custHeadH / 2 + body * 0.35, { align: "center" });

  let ry = y + custHeadH + 4 * s + body * 0.8;
  custWrapped.forEach((row) => {
    setFont("bold", body, ink);
    row.labelLines.forEach((line, i) => {
      doc.text(line, x0 + 8 * s, ry + i * lineH(body));
    });
    setFont("normal", body, ink);
    row.lines.forEach((line, i) => {
      doc.text(line, x0 + 8 * s + labelW, ry + i * lineH(body));
    });
    ry += row.count * lineH(body) + 3 * s;
  });

  // Right: two columns of label / value
  detailRows.forEach(([label, value], i) => {
    const col = i % 2;
    const rowIdx = Math.floor(i / 2);
    const cx = rightX0 + col * colW + 8 * s;
    const yy = y + rowPad + rowIdx * detailLineH + small + 2 * s;
    setFont("normal", small + 0.5, soft);
    doc.text(label, cx, yy);
    setFont("bold", body, ink);
    doc.text(value, cx, yy + lineH(body) + 1 * s, { maxWidth: colW - 14 * s });
  });
  y += infoH;

  // ---- Items table -----------------------------------------------------
  const wSr = 28 * s;
  const wHsn = showHsn ? 56 * s : 0;
  const wQty = 46 * s;
  const wRate = 70 * s;
  const wTotal = 78 * s;
  const wDesc = innerW - wSr - wHsn - wQty - wRate - wTotal;

  const colX: number[] = [];
  {
    let cx = x0;
    for (const w of [wSr, wDesc, wHsn, wQty, wRate, wTotal]) {
      colX.push(cx);
      cx += w;
    }
  }

  const head = ["Sr.\nNo.", "Name of Product / Service"];
  if (showHsn) head.push("HSN / SAC");
  head.push("Qty", "Rate", "Total");

  const bodyRows = items.map((item, idx) => {
    const desc = item.item_code ? `${item.description}\n(${item.item_code})` : item.description;
    const row: (string | number)[] = [String(idx + 1), desc];
    if (showHsn) row.push(item.hsn_code ?? "");
    row.push(
      Number(item.quantity).toLocaleString("en-IN", { maximumFractionDigits: 3 }) + (item.unit ? ` ${item.unit}` : ""),
      Number(item.unit_price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      Number(item.line_total).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    return row;
  });

  const columnStyles: Record<number, object> = {};
  let ci = 0;
  columnStyles[ci++] = { cellWidth: wSr, halign: "center" };
  columnStyles[ci++] = { cellWidth: wDesc, halign: "left" };
  if (showHsn) columnStyles[ci++] = { cellWidth: wHsn, halign: "center" };
  columnStyles[ci++] = { cellWidth: wQty, halign: "right" };
  columnStyles[ci++] = { cellWidth: wRate, halign: "right" };
  columnStyles[ci++] = { cellWidth: wTotal, halign: "right", ...(tintOn ? { fillColor: colTint } : {}) };

  const lastColIndex = head.length - 1;

  autoTable(doc, {
    startY: y,
    margin: { left: x0, right: W - x1, top: topY, bottom: H - bottomLimit },
    head: [head],
    body: bodyRows,
    theme: "plain",
    tableWidth: innerW,
    styles: {
      font,
      fontSize: tableSize,
      textColor: ink,
      cellPadding: { top: 4 * s, bottom: 4 * s, left: 5 * s, right: 5 * s },
      lineWidth: 0,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: tintOn ? headTint : [255, 255, 255],
      textColor: ink,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    columnStyles,
    showHead: "everyPage",
    rowPageBreak: "avoid",
    didParseCell: (data) => {
      // The Total column keeps its tint in the head too.
      if (data.section === "head" && data.column.index === lastColIndex && tintOn) {
        data.cell.styles.fillColor = headTint;
      }
    },
    didDrawCell: (data) => {
      const { cell } = data;
      doc.setDrawColor(...lineColor);
      doc.setLineWidth(0.6);
      doc.line(cell.x, cell.y, cell.x, cell.y + cell.height);
      doc.line(cell.x + cell.width, cell.y, cell.x + cell.width, cell.y + cell.height);
      if (data.section === "head") {
        doc.line(cell.x, cell.y, cell.x + cell.width, cell.y);
        doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
      }
    },
  });
  // @ts-expect-error - lastAutoTable is added by the plugin at runtime
  let tableEnd: number = doc.lastAutoTable.finalY;

  // ---- Measure everything below the table, so the items area can stretch
  //      to push it to the bottom of the page like a printed form. ---------
  const totalRowH = 19 * s;

  const taxRows: { label: string; value: number }[] = [];
  const hasBreakdown = discountAmount > 0 || cgstAmount > 0 || sgstAmount > 0 || igstAmount > 0 || roundOff !== 0;
  if (hasBreakdown) taxRows.push({ label: "Subtotal", value: subtotal + discountAmount });
  if (discountAmount > 0) taxRows.push({ label: "Discount", value: -discountAmount });
  if (cgstAmount > 0) taxRows.push({ label: "CGST", value: cgstAmount });
  if (sgstAmount > 0) taxRows.push({ label: "SGST", value: sgstAmount });
  if (igstAmount > 0) taxRows.push({ label: "IGST", value: igstAmount });
  if (roundOff !== 0) taxRows.push({ label: "Round Off", value: roundOff });

  const wordsOn = currency === "INR";
  const words = wordsOn ? amountToWordsINR(total) : "";
  setFont("normal", body, ink);
  const wordsLines: string[] = wordsOn ? doc.splitTextToSize(words, innerW * 0.55 - 16 * s) : [];
  const amtLeftW = innerW * 0.55;
  const amtRightW = innerW - amtLeftW;
  const amountH = Math.max(
    wordsOn ? 18 * s + wordsLines.length * lineH(body) + 8 * s : 0,
    taxRows.length * 14 * s + 34 * s + 6 * s
  );

  const hasBank =
    showBank &&
    bankDetails &&
    (bankDetails.bankName || bankDetails.accountName || bankDetails.accountNumber || bankDetails.ifscOrSwift || bankDetails.upiId);
  const bankRows: Row[] = [];
  if (hasBank && bankDetails) {
    if (bankDetails.bankName) bankRows.push(["Name", bankDetails.bankName]);
    if (bankDetails.accountName) bankRows.push(["Acc. Name", bankDetails.accountName]);
    if (bankDetails.accountNumber) bankRows.push(["Acc. Number", bankDetails.accountNumber]);
    if (bankDetails.ifscOrSwift) bankRows.push(["IFSC", bankDetails.ifscOrSwift]);
    if (bankDetails.upiId) bankRows.push(["UPI ID", bankDetails.upiId]);
  }
  const qrOn = showQr && Boolean(qrUrl);
  const qrSize = 74 * s;
  const leftFootW = hasBank || qrOn ? innerW * 0.55 : 0;
  const sigW = innerW - leftFootW;
  const bankHeadH = 17 * s;
  const bankH = hasBank || qrOn
    ? bankHeadH + Math.max(bankRows.length * 15 * s + 8 * s, qrOn ? qrSize + 24 * s : 0)
    : 0;
  const sigH = 124 * s;
  const footH = Math.max(bankH, sigH);

  const noteText = showNotes && notes ? notes : "";
  const termsText = showTerms && terms ? terms : "";
  setFont("normal", small + 0.5, ink);
  const noteLines: string[] = noteText ? doc.splitTextToSize(noteText, innerW - 16 * s) : [];
  const termLines: string[] = termsText ? doc.splitTextToSize(termsText, innerW - 16 * s) : [];
  const noteH = noteLines.length ? 18 * s + noteLines.length * lineH(small + 0.5) + 6 * s : 0;
  const termsH = termLines.length ? 18 * s + termLines.length * lineH(small + 0.5) + 6 * s : 0;
  const wmH = plan.invoiceWatermark ? 14 * s : 0;

  const belowH = totalRowH + amountH + footH + noteH + termsH + wmH;

  // Stretch the items area so the totals sit at the bottom of the page.
  const bodyEnd = Math.max(tableEnd, bottomLimit - belowH);
  if (bodyEnd > tableEnd && doc.getCurrentPageInfo().pageNumber === doc.getNumberOfPages()) {
    if (tintOn) {
      doc.setFillColor(...colTint);
      doc.rect(colX[colX.length - 1], tableEnd, wTotal, bodyEnd - tableEnd, "F");
    }
    doc.setDrawColor(...lineColor);
    doc.setLineWidth(0.6);
    colX.forEach((cxp, idx) => {
      if (idx === 2 && !showHsn) return; // no HSN column
      doc.line(cxp, tableEnd, cxp, bodyEnd);
    });
    doc.line(x1, tableEnd, x1, bodyEnd);
    tableEnd = bodyEnd;
  }
  y = tableEnd;

  // ---- Total row ---------------------------------------------------------
  need(totalRowH + amountH);
  const totalQty = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0);
  doc.setDrawColor(...lineColor);
  doc.setLineWidth(0.7);
  doc.rect(x0, y, innerW, totalRowH);
  if (tintOn) {
    doc.setFillColor(...headTint);
    doc.rect(x0, y, innerW, totalRowH, "F");
    doc.rect(x0, y, innerW, totalRowH);
  }
  setFont("bold", body, ink);
  const trY = y + totalRowH / 2 + body * 0.35;
  const qtyColX = showHsn ? colX[3] : colX[2];
  const totalColX = colX[5];
  doc.text("Total", qtyColX - 10 * s, trY, { align: "right" });
  doc.text(
    totalQty.toLocaleString("en-IN", { maximumFractionDigits: 3 }),
    qtyColX + wQty - 5 * s,
    trY,
    { align: "right" }
  );
  doc.text(
    items
      .reduce((sum, it) => sum + Number(it.line_total || 0), 0)
      .toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    totalColX + wTotal - 5 * s,
    trY,
    { align: "right" }
  );
  y += totalRowH;

  // ---- Words (left) | tax lines + total amount (right) --------------------
  need(amountH);
  doc.rect(x0, y, innerW, amountH);
  doc.line(x0 + amtLeftW, y, x0 + amtLeftW, y + amountH);
  if (wordsOn) {
    if (tintOn) {
      doc.setFillColor(...headTint);
      doc.rect(x0, y, amtLeftW, 17 * s, "F");
      doc.rect(x0, y, amtLeftW, 17 * s);
    } else {
      doc.line(x0, y + 17 * s, x0 + amtLeftW, y + 17 * s);
    }
    setFont("bold", body, ink);
    doc.text("Total in words", x0 + amtLeftW / 2, y + 17 * s / 2 + body * 0.35, { align: "center" });
    setFont("normal", body, ink);
    wordsLines.forEach((line, i) => {
      doc.text(line.toUpperCase(), x0 + amtLeftW / 2, y + 17 * s + 12 * s + i * lineH(body), { align: "center" });
    });
  }

  let ay = y + 12 * s;
  taxRows.forEach((r) => {
    setFont("normal", body, soft);
    doc.text(r.label, x0 + amtLeftW + 10 * s, ay);
    setFont("normal", body, ink);
    doc.text(
      r.value < 0 ? `-${money(Math.abs(r.value), currency)}` : money(r.value, currency),
      x1 - 10 * s,
      ay,
      { align: "right" }
    );
    ay += 14 * s;
  });
  const grandY = y + amountH - 16 * s;
  if (taxRows.length) {
    doc.line(x0 + amtLeftW, grandY - 14 * s, x1, grandY - 14 * s);
  }
  setFont("bold", base, ink);
  doc.text("Total Amount", x0 + amtLeftW + 10 * s, grandY);
  setFont("bold", totalSize, isSimple ? ink : accent);
  doc.text(money(total, currency), x1 - 10 * s, grandY, { align: "right" });
  setFont("normal", small, soft);
  doc.text("(E & O.E.)", x1 - 10 * s, grandY + 10 * s, { align: "right" });
  y += amountH;

  // ---- Bank / QR (left) | signature (right) --------------------------------
  need(footH);
  doc.rect(x0, y, innerW, footH);
  if (leftFootW > 0) {
    doc.line(x0 + leftFootW, y, x0 + leftFootW, y + footH);
    if (tintOn) {
      doc.setFillColor(...headTint);
      doc.rect(x0, y, leftFootW, bankHeadH, "F");
      doc.rect(x0, y, leftFootW, bankHeadH);
    } else {
      doc.line(x0, y + bankHeadH, x0 + leftFootW, y + bankHeadH);
    }
    setFont("bold", body, ink);
    doc.text("Bank Details", x0 + leftFootW / 2, y + bankHeadH / 2 + body * 0.35, { align: "center" });

    let by = y + bankHeadH + 12 * s;
    bankRows.forEach(([label, value]) => {
      setFont("normal", body, soft);
      doc.text(label, x0 + 8 * s, by);
      setFont("normal", body, ink);
      doc.text(value, x0 + 8 * s + 66 * s, by, { maxWidth: leftFootW - 66 * s - 16 * s - (qrOn ? qrSize : 0) });
      by += 15 * s;
    });

    if (qrOn && qrUrl) {
      const qrData = await loadImage(qrUrl);
      if (qrData) {
        try {
          doc.addImage(qrData, x0 + leftFootW - qrSize - 10 * s, y + bankHeadH + 6 * s, qrSize, qrSize);
          setFont("bold", small, ink);
          doc.text("Pay using UPI", x0 + leftFootW - qrSize / 2 - 10 * s, y + bankHeadH + qrSize + 16 * s, {
            align: "center",
          });
        } catch {
          // Unsupported QR image — skip it.
        }
      }
    }
  }

  const sigX = x0 + leftFootW;
  const sigCenter = sigX + sigW / 2;
  let sY = y;
  if (docLabel === "INVOICE") {
    setFont("bold", small, ink);
    const certLines: string[] = doc.splitTextToSize(
      "Certified that the particulars given above are true and correct.",
      sigW - 10 * s
    );
    const certH = Math.max(bankHeadH, certLines.length * lineH(small) + 6 * s);
    if (tintOn) {
      doc.setFillColor(...headTint);
      doc.rect(sigX, y, sigW, certH, "F");
      doc.rect(sigX, y, sigW, certH);
    } else {
      doc.line(sigX, y + certH, sigX + sigW, y + certH);
    }
    certLines.forEach((line, i) => {
      doc.text(line, sigCenter, y + 4 * s + small + i * lineH(small), { align: "center" });
    });
    sY = y + certH;
  }
  setFont("bold", base, ink);
  doc.text(`For ${profile.business_name || "Your Business"}`, sigCenter, sY + 16 * s, {
    align: "center",
    maxWidth: sigW - 12 * s,
  });
  if (showSignature && signatureUrl) {
    const sigData = await loadImage(signatureUrl);
    if (sigData) {
      try {
        const props = doc.getImageProperties(sigData);
        const maxW = 120 * s;
        const maxH = 46 * s;
        const ratio = Math.min(maxW / props.width, maxH / props.height);
        const w = props.width * ratio;
        const h = props.height * ratio;
        doc.addImage(sigData, sigCenter - w / 2, sY + 22 * s, w, h);
      } catch {
        // Skip an unreadable signature image.
      }
    }
  }
  doc.line(sigX, y + footH - 18 * s, sigX + sigW, y + footH - 18 * s);
  setFont("bold", small, ink);
  doc.text("Authorised Signatory", sigCenter, y + footH - 7 * s, { align: "center" });
  y += footH;

  // ---- Notes + Terms ---------------------------------------------------------
  const textBox = (title: string, lines: string[], h: number) => {
    need(h);
    doc.setDrawColor(...lineColor);
    doc.rect(x0, y, innerW, h);
    setFont("bold", body, ink);
    doc.text(title, x0 + 8 * s, y + 12 * s);
    setFont("normal", small + 0.5, ink);
    lines.forEach((line, i) => {
      doc.text(line, x0 + 8 * s, y + 24 * s + i * lineH(small + 0.5));
    });
    y += h;
  };
  if (noteLines.length) textBox("Notes", noteLines, noteH);
  if (termLines.length) textBox("Terms & Conditions", termLines, termsH);

  if (plan.invoiceWatermark) {
    need(wmH);
    setFont("italic", small, [140, 140, 140]);
    doc.text("Generated by Zen Biz", x1, y + 10 * s, { align: "right" });
  }

  // Page numbers when the document runs to more than one page.
  const pages = doc.getNumberOfPages();
  if (pages > 1) {
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      setFont("normal", small, soft);
      doc.text(`Page ${p} of ${pages}`, W / 2, H - 12 * s, { align: "center" });
    }
  }

  if (preview) return doc.output("blob");
  doc.save(`${filenamePrefix}-${docNumber}.pdf`);
}
