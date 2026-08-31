import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DocDesignSettings, Profile } from "@/types/database";
import { CURRENCY_SYMBOLS } from "@/types/database";
import { amountToWordsINR } from "@/lib/amountToWords";
import { getPlanFeatures } from "@/lib/planFeatures";

/**
 * jsPDF's built-in fonts can't render the Rupee glyph (₹) reliably across
 * all viewers, so INR keeps the "Rs." text prefix it always had; every
 * other currency uses its normal symbol, which the built-in fonts do
 * support.
 */
export function formatCurrencyForPdf(n: number, currency: string = "INR") {
  const formatted = n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === "INR") return `Rs. ${formatted}`;
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${formatted}`;
}

export interface PdfLineItem {
  description: string;
  quantity: number;
  unit: string;
  item_code?: string | null;
  hsn_code?: string | null;
  unit_price: number;
  tax_percent?: number;
  line_total: number;
}

export interface PdfPartyInfo {
  name: string;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  gstin?: string | null;
}

// Physical page dimensions in points (1pt = 1/72 inch). Thermal receipt
// width follows the common 80mm printer standard; height grows with content
// so it isn't a fixed page size the way A4/A5 are.
const PAPER_DIMENSIONS: Record<string, { width: number; height: number | "auto" }> = {
  a4: { width: 595, height: 842 },
  a5: { width: 420, height: 595 },
  thermal: { width: 227, height: "auto" }, // 80mm
};

/**
 * jsPDF's addImage needs raw image data, not a remote URL — this fetches
 * the signature/seal image and converts it to a base64 data URL so it can
 * be embedded directly in the PDF. Returns null on any failure so the
 * caller can skip the image gracefully rather than breaking PDF generation.
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
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

/**
 * Shared layout engine for every "sale-style" document Zen Biz produces —
 * invoices, quotations, and purchases. `design` controls paper size, visual
 * style, and font size independently for each document type, since a shop
 * owner might want A4 default invoices but thermal receipts for quotations
 * (or any other combination).
 */
export async function generateSaleDocumentPdf({
  docLabel,
  docNumber,
  docDate,
  dueDate,
  status,
  partyLabel,
  party,
  shipTo,
  items,
  subtotal,
  gstEnabled,
  gstPercent,
  gstAmount,
  cgstAmount,
  sgstAmount,
  igstAmount,
  total,
  notes,
  profile,
  filenamePrefix,
  design,
  terms,
  signatureUrl,
  currency = "INR",
  bankDetails,
  qrUrl,
}: {
  docLabel: string;
  docNumber: string;
  docDate: string;
  dueDate?: string | null;
  status?: string;
  partyLabel: string;
  party: PdfPartyInfo | null;
  shipTo?: { name?: string | null; address?: string | null } | null;
  items: PdfLineItem[];
  subtotal: number;
  gstEnabled: boolean;
  gstPercent: number;
  gstAmount: number;
  // Optional — when provided, the PDF shows a CGST/SGST/IGST breakdown
  // instead of one lump "GST" line, matching how Indian tax invoices are
  // normally read. If omitted, falls back to showing gstAmount as IGST.
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  total: number;
  notes?: string | null;
  profile: Profile;
  filenamePrefix: string;
  design: DocDesignSettings;
  terms?: string | null;
  signatureUrl?: string | null;
  currency?: string;
  bankDetails?: {
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    ifscOrSwift?: string | null;
  } | null;
  qrUrl?: string | null;
}) {
  if (design.paperSize === "thermal") {
    return renderThermalPdf({
      docLabel,
      docNumber,
      docDate,
      status,
      partyLabel,
      party,
      items,
      subtotal,
      gstEnabled,
      gstPercent,
      gstAmount,
      total,
      notes,
      profile,
      filenamePrefix,
      fontSize: design.fontSize,
      style: design.style,
      terms,
      currency,
      bankDetails,
    });
  }

  return renderStandardPdf({
    docLabel,
    docNumber,
    docDate,
    dueDate,
    status,
    partyLabel,
    party,
    shipTo,
    items,
    subtotal,
    gstEnabled,
    gstPercent,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    total,
    notes,
    profile,
    filenamePrefix,
    paperSize: design.paperSize,
    fontSize: design.fontSize,
    style: design.style,
    terms,
    signatureUrl,
    currency,
    bankDetails,
    qrUrl,
  });
}

// ---------------------------------------------------------------------------
// Standard layout — used for A4 and A5. Scales margins and type size to fit
// the smaller A5 page proportionally rather than just shrinking text.
// ---------------------------------------------------------------------------
async function renderStandardPdf(args: {
  docLabel: string;
  docNumber: string;
  docDate: string;
  dueDate?: string | null;
  status?: string;
  partyLabel: string;
  party: PdfPartyInfo | null;
  shipTo?: { name?: string | null; address?: string | null } | null;
  items: PdfLineItem[];
  subtotal: number;
  gstEnabled: boolean;
  gstPercent: number;
  gstAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  total: number;
  notes?: string | null;
  profile: Profile;
  filenamePrefix: string;
  paperSize: "a4" | "a5";
  fontSize: number;
  style: string;
  terms?: string | null;
  signatureUrl?: string | null;
  currency?: string;
  bankDetails?: {
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    ifscOrSwift?: string | null;
  } | null;
  qrUrl?: string | null;
}) {
  const {
    docLabel, docNumber, docDate, dueDate, status, partyLabel, party, shipTo, items, subtotal,
    gstEnabled, gstPercent, gstAmount, cgstAmount = 0, sgstAmount = 0, igstAmount = 0, total, notes, profile, filenamePrefix,
    paperSize, fontSize, style, terms, signatureUrl, currency = "INR", bankDetails, qrUrl,
  } = args;

  // "Default" uses the Zen Biz teal/brass palette throughout (table header,
  // accent text, rules). "Simple" strips all colour to pure black/grey —
  // ink-friendly and neutral for printing on any office printer.
  const isSimple = style === "thermal_simple";
  const colors = isSimple
    ? {
        accent: [26, 26, 26] as [number, number, number],
        accentSoft: [86, 82, 72] as [number, number, number],
        tableHeaderFill: [26, 26, 26] as [number, number, number],
        tableHeaderText: [255, 255, 255] as [number, number, number],
        tableAltRow: [245, 245, 245] as [number, number, number],
        rule: [200, 200, 200] as [number, number, number],
        metaBg: [248, 248, 248] as [number, number, number],
        badgeBg: [238, 238, 238] as [number, number, number],
      }
    : {
        accent: [15, 61, 62] as [number, number, number],
        accentSoft: [86, 82, 72] as [number, number, number],
        tableHeaderFill: [15, 61, 62] as [number, number, number],
        tableHeaderText: [247, 245, 240] as [number, number, number],
        tableAltRow: [247, 245, 240] as [number, number, number],
        rule: [228, 224, 214] as [number, number, number],
        metaBg: [247, 245, 240] as [number, number, number],
        badgeBg: [225, 234, 233] as [number, number, number],
      };

  const dims = PAPER_DIMENSIONS[paperSize];
  const scale = paperSize === "a5" ? 0.75 : 1; // proportionally smaller margins/type on A5
  const pageWidth = dims.width as number;
  const marginX = 40 * scale;
  const rightX = pageWidth - marginX;
  let y = 50 * scale;

  const doc = new jsPDF({ unit: "pt", format: [dims.width, dims.height as number] });

  const base = fontSize; // body text size, everything else scales relative to this
  const titleSize = base + 14;
  const headingSize = base + 16;
  const smallSize = Math.max(base - 1.5, 7);

  // Header — business logo (if set) + name/address, left; big document
  // title, right.
  let textStartX = marginX;
  if (profile.logo_url) {
    const logoSize = 40 * scale;
    try {
      const logoData = await loadImageAsDataUrl(profile.logo_url);
      if (logoData) {
        doc.addImage(logoData, marginX, y - 26 * scale, logoSize, logoSize, undefined, "CONTAIN");
        textStartX = marginX + logoSize + 10 * scale;
      }
    } catch {
      // If the logo can't be loaded, fall back to text-only header rather
      // than failing the whole PDF.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleSize);
  doc.setTextColor(...colors.accent);
  doc.text(profile.business_name || "Your Business", textStartX, y);
  let leftY = y + 18 * scale;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(smallSize);
  doc.setTextColor(...colors.accentSoft);
  if (profile.address) {
    const addrLines = doc.splitTextToSize(profile.address, 220 * scale);
    doc.text(addrLines, textStartX, leftY);
    leftY += addrLines.length * 11 * scale;
  }
  if (profile.phone) {
    doc.text(`Tel: ${profile.phone}`, textStartX, leftY);
    leftY += 11 * scale;
  }
  if (profile.gst_number) {
    doc.text(`GSTIN: ${profile.gst_number}`, textStartX, leftY);
    leftY += 11 * scale;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(headingSize);
  doc.setTextColor(...colors.accent);
  doc.text(docLabel, rightX, y + 6 * scale, { align: "right" });

  // Boxed metadata table (No. / Date / Due Date / Currency), right-aligned
  // under the title — matches the reference invoice's info box.
  const metaRows: [string, string][] = [
    ["No.", docNumber],
    ["Date", docDate],
  ];
  if (dueDate) metaRows.push([docLabel === "QUOTATION" ? "Valid Until" : "Due Date", dueDate]);
  metaRows.push(["Currency", currency]);
  if (status) metaRows.push(["Status", status.toUpperCase()]);

  const metaBoxWidth = 190 * scale;
  const metaRowHeight = 17 * scale;
  const metaBoxX = rightX - metaBoxWidth;
  let metaY = y + 22 * scale;

  doc.setDrawColor(...colors.rule);
  doc.setFillColor(...colors.metaBg);
  doc.roundedRect(metaBoxX, metaY, metaBoxWidth, metaRowHeight * metaRows.length, 4, 4, "FD");

  doc.setFontSize(smallSize);
  metaRows.forEach(([label, value], i) => {
    const rowY = metaY + metaRowHeight * i + metaRowHeight / 2 + 3 * scale;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 26, 26);
    doc.text(label, metaBoxX + 10 * scale, rowY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.accent);
    doc.text(value, metaBoxX + metaBoxWidth - 10 * scale, rowY, { align: "right" });
    if (i < metaRows.length - 1) {
      doc.setDrawColor(...colors.rule);
      doc.line(
        metaBoxX,
        metaY + metaRowHeight * (i + 1),
        metaBoxX + metaBoxWidth,
        metaY + metaRowHeight * (i + 1)
      );
    }
  });

  y = Math.max(leftY, metaY + metaRowHeight * metaRows.length) + 22 * scale;

  doc.setDrawColor(...colors.rule);
  doc.line(marginX, y, rightX, y);
  y += 22 * scale;

  // Bill To (left) and Ship To (right, only if provided) — side by side,
  // each with a small label badge, matching the reference layout.
  const partyColWidth = shipTo ? (rightX - marginX) / 2 - 12 * scale : rightX - marginX;

  function drawBadge(x: number, yTop: number, kind: "person" | "truck") {
    const size = 22 * scale;
    doc.setFillColor(...colors.badgeBg);
    doc.roundedRect(x, yTop, size, size, 5 * scale, 5 * scale, "F");
    doc.setDrawColor(...colors.accent);
    doc.setLineWidth(1.3);
    const cx = x + size / 2;
    const cy = yTop + size / 2;
    if (kind === "person") {
      // Simple head-and-shoulders glyph.
      doc.circle(cx, cy - 3.5 * scale, 3.2 * scale, "S");
      doc.line(cx - 5.5 * scale, cy + 7 * scale, cx - 3 * scale, cy + 1.5 * scale);
      doc.line(cx - 3 * scale, cy + 1.5 * scale, cx + 3 * scale, cy + 1.5 * scale);
      doc.line(cx + 3 * scale, cy + 1.5 * scale, cx + 5.5 * scale, cy + 7 * scale);
      doc.line(cx - 5.5 * scale, cy + 7 * scale, cx + 5.5 * scale, cy + 7 * scale);
    } else {
      // Simple delivery-truck glyph: cab + box + two wheels.
      doc.rect(cx - 6.5 * scale, cy - 3 * scale, 8 * scale, 6 * scale, "S");
      doc.rect(cx + 1.5 * scale, cy - 1 * scale, 5 * scale, 4 * scale, "S");
      doc.circle(cx - 3.5 * scale, cy + 4.5 * scale, 1.4 * scale, "S");
      doc.circle(cx + 3.5 * scale, cy + 4.5 * scale, 1.4 * scale, "S");
    }
    return size;
  }

  function renderPartyBlock(
    label: string,
    info: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null; gstin?: string | null } | null,
    x: number,
    badgeKind: "person" | "truck"
  ) {
    const badgeSize = drawBadge(x, y - 15 * scale, badgeKind);
    const textX = x + badgeSize + 8 * scale;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(smallSize);
    doc.setTextColor(...colors.accent);
    doc.text(label.toUpperCase(), textX, y);
    let py = y + 15 * scale;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(base);
    doc.setTextColor(26, 26, 26);
    doc.text(info?.name ?? "Not specified", x, py);
    py += 14 * scale;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(smallSize);
    doc.setTextColor(...colors.accentSoft);
    if (info?.address) {
      const lines = doc.splitTextToSize(info.address, partyColWidth);
      doc.text(lines, x, py);
      py += lines.length * 11 * scale;
    }
    if (info?.email) {
      doc.text(info.email, x, py);
      py += 11 * scale;
    }
    if (info?.phone) {
      doc.text(info.phone, x, py);
      py += 11 * scale;
    }
    if (info?.gstin) {
      doc.text(`GSTIN: ${info.gstin}`, x, py);
      py += 11 * scale;
    }
    return py;
  }

  const billBottom = renderPartyBlock(partyLabel, party, marginX, "person");
  let shipBottom = billBottom;
  if (shipTo) {
    const shipX = marginX + partyColWidth + 24 * scale;
    shipBottom = renderPartyBlock("Ship To", shipTo, shipX, "truck");
  }

  y = Math.max(billBottom, shipBottom) + 14 * scale;

  const planFeatures = getPlanFeatures(profile.plan);
  const showHsn = planFeatures.gstBilling;
  const hasAnyTax = items.some((it) => Number(it.tax_percent ?? 0) > 0);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "#",
        "Item Description",
        ...(showHsn ? ["HSN"] : []),
        "Qty",
        "Unit Price",
        ...(hasAnyTax ? ["Tax (%)"] : []),
        "Amount",
      ],
    ],
    body: items.map((item, i) => {
      const descriptionCell = item.item_code
        ? `${item.description}\n${item.unit !== "item" ? item.unit + " · " : ""}Code: ${item.item_code}`
        : item.unit !== "item"
          ? `${item.description}\n${item.unit}`
          : item.description;
      const row = [String(i + 1), descriptionCell];
      if (showHsn) row.push(item.hsn_code || "—");
      row.push(String(item.quantity), formatCurrencyForPdf(Number(item.unit_price), currency));
      if (hasAnyTax) row.push(item.tax_percent ? `${item.tax_percent}%` : "0%");
      row.push(formatCurrencyForPdf(Number(item.line_total), currency));
      return row;
    }),
    styles: { fontSize: smallSize, cellPadding: 8 * scale, textColor: [26, 26, 26] },
    headStyles: { fillColor: colors.tableHeaderFill, textColor: colors.tableHeaderText },
    alternateRowStyles: { fillColor: colors.tableAltRow },
    columnStyles: {
      0: { cellWidth: 22 * scale },
      [showHsn ? 3 : 2]: { halign: "right" },
    },
    margin: { left: marginX, right: pageWidth - rightX },
  });

  // @ts-expect-error - lastAutoTable is added by the plugin at runtime
  let afterTableY = doc.lastAutoTable.finalY + 20 * scale;

  // Reserve enough space for the amount column based on the widest amount
  // and label actually being printed, rather than a fixed offset — a fixed
  // offset breaks on narrower pages (A5) or with bold/larger "Total" text,
  // causing the label and the amount to visually overlap.
  const totalLineTax = items.reduce(
    (sum, it) => sum + Number(it.line_total) * (Number(it.tax_percent ?? 0) / 100),
    0
  );
  // Shown as a single blended rate when every taxed line shares the same
  // percentage (the common case); otherwise just labelled "Total Tax".
  const distinctTaxRates = Array.from(
    new Set(items.filter((it) => Number(it.tax_percent ?? 0) > 0).map((it) => Number(it.tax_percent)))
  );
  const taxLabel =
    distinctTaxRates.length === 1 ? `Total Tax (${distinctTaxRates[0]}%)` : "Total Tax";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(base + 2);
  const widestLabelWidth = doc.getTextWidth("Total");
  const widestAmountWidth = Math.max(
    doc.getTextWidth(formatCurrencyForPdf(subtotal, currency)),
    doc.getTextWidth(formatCurrencyForPdf(gstAmount, currency)),
    doc.getTextWidth(formatCurrencyForPdf(cgstAmount, currency)),
    doc.getTextWidth(formatCurrencyForPdf(sgstAmount, currency)),
    doc.getTextWidth(formatCurrencyForPdf(igstAmount, currency)),
    doc.getTextWidth(formatCurrencyForPdf(totalLineTax, currency)),
    doc.getTextWidth(formatCurrencyForPdf(total, currency))
  );
  const labelX = rightX - widestAmountWidth - widestLabelWidth - 24 * scale;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(base);
  doc.setTextColor(...colors.accentSoft);
  doc.text("Subtotal", labelX, afterTableY, { align: "left" });
  doc.text(formatCurrencyForPdf(subtotal, currency), rightX, afterTableY, { align: "right" });
  afterTableY += 18 * scale;

  const hasGstSplit = cgstAmount > 0 || sgstAmount > 0 || igstAmount > 0;

  // Show either the per-line "Total Tax" breakdown or the CGST/SGST/IGST
  // split, never both — they represent the same tax amount computed two
  // different ways, and showing both would visually double it.
  if (!hasGstSplit && totalLineTax > 0) {
    doc.text(taxLabel, labelX, afterTableY, { align: "left" });
    doc.text(formatCurrencyForPdf(totalLineTax, currency), rightX, afterTableY, { align: "right" });
    afterTableY += 18 * scale;
  }

  if (cgstAmount > 0 || sgstAmount > 0) {
    doc.text("CGST", labelX, afterTableY, { align: "left" });
    doc.text(formatCurrencyForPdf(cgstAmount, currency), rightX, afterTableY, { align: "right" });
    afterTableY += 18 * scale;
    doc.text("SGST", labelX, afterTableY, { align: "left" });
    doc.text(formatCurrencyForPdf(sgstAmount, currency), rightX, afterTableY, { align: "right" });
    afterTableY += 18 * scale;
  } else if (igstAmount > 0) {
    doc.text("IGST", labelX, afterTableY, { align: "left" });
    doc.text(formatCurrencyForPdf(igstAmount, currency), rightX, afterTableY, { align: "right" });
    afterTableY += 18 * scale;
  } else if (gstEnabled) {
    doc.text(`GST (${gstPercent}%)`, labelX, afterTableY, { align: "left" });
    doc.text(formatCurrencyForPdf(gstAmount, currency), rightX, afterTableY, { align: "right" });
    afterTableY += 18 * scale;
  }

  doc.setDrawColor(...colors.rule);
  doc.line(labelX, afterTableY, rightX, afterTableY);
  afterTableY += 18 * scale;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(base + 2);
  doc.setTextColor(...colors.accent);
  doc.text("Total", labelX, afterTableY, { align: "left" });
  doc.text(formatCurrencyForPdf(total, currency), rightX, afterTableY, { align: "right" });
  afterTableY += 22 * scale;

  // Amount in words — printed on every INR document, right under the
  // total. Skipped for other currencies since the "Rupees ... Only"
  // phrasing is India-specific; a proper multi-currency version isn't
  // built yet.
  if (currency === "INR") {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(smallSize);
    doc.setTextColor(...colors.accentSoft);
    const wordsLines = doc.splitTextToSize(
      `Amount in words: ${amountToWordsINR(total)}`,
      pageWidth - marginX * 2
    );
    doc.text(wordsLines, marginX, afterTableY);
    afterTableY += wordsLines.length * 12 * scale + 14 * scale;
  }

  if (notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(smallSize);
    doc.setTextColor(86, 82, 72);
    doc.text("Notes", marginX, afterTableY);
    afterTableY += 14 * scale;
    const noteLines = doc.splitTextToSize(notes, pageWidth - marginX * 2);
    doc.text(noteLines, marginX, afterTableY);
    afterTableY += noteLines.length * 12 * scale + 10 * scale;
  }

  // Terms & Conditions (left) and Signature/Seal (right), side by side —
  // both optional and independent per document type.
  if (terms || signatureUrl) {
    afterTableY += 10 * scale;
    doc.setDrawColor(...colors.rule);
    doc.line(marginX, afterTableY, rightX, afterTableY);
    afterTableY += 20 * scale;

    const columnWidth = (rightX - marginX) / 2 - 10 * scale;
    let termsBottomY = afterTableY;

    if (terms) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(smallSize + 0.5);
      doc.setTextColor(...colors.accent);
      doc.text("Terms & Conditions", marginX, afterTableY);
      let ty = afterTableY + 14 * scale;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(smallSize - 0.5);
      doc.setTextColor(86, 82, 72);
      const termsLines = doc.splitTextToSize(terms, columnWidth);
      doc.text(termsLines, marginX, ty);
      ty += termsLines.length * 10.5 * scale;
      termsBottomY = ty;
    }

    if (signatureUrl) {
      const sigX = marginX + columnWidth + 20 * scale;
      const sigBoxWidth = columnWidth;
      const sigBoxHeight = 60 * scale;
      try {
        const imageData = await loadImageAsDataUrl(signatureUrl);
        if (imageData) {
          doc.addImage(imageData, sigX, afterTableY, sigBoxWidth, sigBoxHeight, undefined, "CONTAIN");
        }
      } catch {
        // If the signature image can't be loaded (network hiccup, deleted
        // file), the PDF still generates fine — just without the image.
      }
      doc.setDrawColor(...colors.rule);
      doc.line(sigX, afterTableY + sigBoxHeight + 4 * scale, sigX + sigBoxWidth, afterTableY + sigBoxHeight + 4 * scale);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(smallSize - 1);
      doc.setTextColor(86, 82, 72);
      doc.text("Authorized Signatory", sigX, afterTableY + sigBoxHeight + 16 * scale);
      termsBottomY = Math.max(termsBottomY, afterTableY + sigBoxHeight + 16 * scale);
    }

    afterTableY = termsBottomY;
  }

  // Bank details (left) and payment QR (right) — shared business-wide,
  // shown on every document when the owner has filled them in.
  const hasBankDetails =
    bankDetails &&
    (bankDetails.bankName || bankDetails.accountName || bankDetails.accountNumber || bankDetails.ifscOrSwift);
  if (hasBankDetails || qrUrl) {
    afterTableY += 14 * scale;
    doc.setDrawColor(...colors.rule);
    doc.line(marginX, afterTableY, rightX, afterTableY);
    afterTableY += 18 * scale;

    let bankBottomY = afterTableY;

    if (hasBankDetails) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(smallSize + 0.5);
      doc.setTextColor(...colors.accent);
      doc.text("Payment details", marginX, afterTableY);
      let by = afterTableY + 14 * scale;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(smallSize - 0.5);
      doc.setTextColor(86, 82, 72);
      const bankLines = [
        bankDetails?.bankName ? `Bank: ${bankDetails.bankName}` : null,
        bankDetails?.accountName ? `Account name: ${bankDetails.accountName}` : null,
        bankDetails?.accountNumber ? `Account no: ${bankDetails.accountNumber}` : null,
        bankDetails?.ifscOrSwift ? `IFSC/SWIFT: ${bankDetails.ifscOrSwift}` : null,
      ].filter((l): l is string => Boolean(l));
      for (const line of bankLines) {
        doc.text(line, marginX, by);
        by += 12 * scale;
      }
      by += 4 * scale;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(smallSize - 1.5);
      doc.setTextColor(...colors.accentSoft);
      doc.text("We accept: Bank Transfer, UPI, Cash, Cheque", marginX, by);
      by += 11 * scale;
      bankBottomY = by;
    }

    if (qrUrl) {
      const qrSize = 70 * scale;
      const qrX = rightX - qrSize;
      try {
        const imageData = await loadImageAsDataUrl(qrUrl);
        if (imageData) {
          doc.addImage(imageData, qrX, afterTableY, qrSize, qrSize, undefined, "CONTAIN");
        }
      } catch {
        // Skip the QR image if it can't be loaded — the rest of the PDF
        // still generates fine.
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(smallSize - 1.5);
      doc.setTextColor(86, 82, 72);
      doc.text("Scan to pay", qrX + qrSize / 2, afterTableY + qrSize + 12 * scale, {
        align: "center",
      });
      bankBottomY = Math.max(bankBottomY, afterTableY + qrSize + 12 * scale);
    }

    afterTableY = bankBottomY;
  }

  doc.setFont("helvetica", "italic");
  doc.setFontSize(smallSize - 1);
  doc.setTextColor(150, 145, 135);
  // Pin the footer near the bottom of the page, but never let it overlap
  // content above it — a long Terms & Conditions block or many line items
  // can push afterTableY past the usual footer position. This does not add
  // a second page; on genuinely long documents the footer note will simply
  // sit directly under the content instead of pagination (multi-page PDFs
  // aren't implemented yet).
  const footerY = Math.max((dims.height as number) - 30 * scale, afterTableY + 20 * scale);
  doc.text("Generated with Zen Biz", marginX, footerY);

  if (planFeatures.invoiceWatermark) {
    // Diagonal watermark across the page — Starter plan only. Drawn last
    // so it layers over the content, but at low opacity so nothing becomes
    // unreadable.
    doc.saveGraphicsState();
    // @ts-expect-error - GState is part of jsPDF's runtime API but not in
    // the bundled type definitions for this version.
    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(60 * scale);
    doc.setTextColor(15, 61, 62);
    doc.text("ZEN BIZ", pageWidth / 2, (dims.height as number) / 2, {
      align: "center",
      angle: 35,
    });
    doc.restoreGraphicsState();
  }

  doc.save(`${filenamePrefix}-${docNumber}.pdf`);
}

// ---------------------------------------------------------------------------
// Thermal layout — narrow single-column receipt style, height grows with
// content since receipt printers don't use a fixed page length.
// ---------------------------------------------------------------------------
function renderThermalPdf(args: {
  docLabel: string;
  docNumber: string;
  docDate: string;
  status?: string;
  partyLabel: string;
  party: PdfPartyInfo | null;
  items: PdfLineItem[];
  subtotal: number;
  gstEnabled: boolean;
  gstPercent: number;
  gstAmount: number;
  total: number;
  notes?: string | null;
  profile: Profile;
  filenamePrefix: string;
  fontSize: number;
  style: string;
  terms?: string | null;
  currency?: string;
  bankDetails?: {
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    ifscOrSwift?: string | null;
  } | null;
}) {
  const {
    docLabel, docNumber, docDate, status, partyLabel, party, items, subtotal,
    gstEnabled, gstPercent, gstAmount, total, notes, profile, filenamePrefix, fontSize, style, terms,
    currency = "INR", bankDetails,
  } = args;

  // "Default" gives the business name a bold boxed banner and solid rules —
  // reads like a proper till receipt. "Simple" drops the box and uses
  // dashed minimal rules — the bare-bones fastest-to-print version. Both
  // stay monochrome since thermal printers can't render colour.
  const isSimple = style === "thermal_simple";
  const planFeatures = getPlanFeatures(profile.plan);
  // HSN code is a GST compliance field — only Business-plan accounts see it
  // printed on documents, even though it can be entered for free.
  const showHsn = planFeatures.gstBilling;

  const pageWidth = PAPER_DIMENSIONS.thermal.width;
  const marginX = 10;
  const contentWidth = pageWidth - marginX * 2;
  const base = fontSize;

  // Thermal receipts have no fixed page length — estimate the final height
  // from content up front (line-by-line) so the generated PDF page is
  // trimmed to size rather than left with a large blank tail.
  const lineHeight = 11;
  let estimatedLines = 26; // header, party info, totals, amount-in-words, signature, footer
  for (const item of items) {
    const nameLines = Math.ceil(item.description.length / 28) || 1;
    estimatedLines += nameLines + 1; // description line(s) + qty/price line
    if (item.item_code || (showHsn && item.hsn_code)) estimatedLines += 1;
  }
  if (profile.address) estimatedLines += Math.ceil(profile.address.length / 32);
  if (notes) estimatedLines += Math.ceil(notes.length / 32) + 1;
  if (terms) estimatedLines += Math.ceil(terms.length / 32) + 2;
  if (bankDetails) {
    const bankFieldCount = [
      bankDetails.bankName,
      bankDetails.accountName,
      bankDetails.accountNumber,
      bankDetails.ifscOrSwift,
    ].filter(Boolean).length;
    if (bankFieldCount > 0) estimatedLines += bankFieldCount + 2;
  }

  const estimatedHeight = Math.max(230, estimatedLines * lineHeight + 60);
  const doc = new jsPDF({ unit: "pt", format: [pageWidth, estimatedHeight] });

  let y = 20;

  if (!isSimple) {
    // Boxed banner around the business name for the Default thermal style.
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(1);
    doc.rect(marginX, y - 12, contentWidth, 22);
  }

  doc.setFont("courier", "bold");
  doc.setFontSize(base + 2);
  doc.setTextColor(26, 26, 26);
  doc.text(profile.business_name || "Your Business", pageWidth / 2, y, { align: "center" });
  y += isSimple ? 14 : 20;

  doc.setFont("courier", "normal");
  doc.setFontSize(base - 1);
  if (profile.phone) {
    doc.text(profile.phone, pageWidth / 2, y, { align: "center" });
    y += 11;
  }
  if (profile.address) {
    const lines = doc.splitTextToSize(profile.address, contentWidth);
    doc.text(lines, pageWidth / 2, y, { align: "center" });
    y += lines.length * 11;
  }
  if (profile.gst_number) {
    doc.text(`GSTIN: ${profile.gst_number}`, pageWidth / 2, y, { align: "center" });
    y += 11;
  }

  y += 6;
  if (isSimple) {
    doc.setLineDashPattern([2, 1], 0);
  } else {
    doc.setLineDashPattern([], 0);
    doc.setLineWidth(1.2);
  }
  doc.line(marginX, y, pageWidth - marginX, y);
  doc.setLineWidth(1);
  y += 14;

  doc.setFont("courier", "bold");
  doc.setFontSize(base);
  doc.text(docLabel, marginX, y);
  y += 13;

  doc.setFont("courier", "normal");
  doc.setFontSize(base - 1);
  doc.text(`No: ${docNumber}`, marginX, y);
  y += 11;
  doc.text(`Date: ${docDate}`, marginX, y);
  y += 11;
  if (status) {
    doc.text(`Status: ${status.toUpperCase()}`, marginX, y);
    y += 11;
  }
  y += 3;

  doc.text(`${partyLabel}: ${party?.name ?? "Not specified"}`, marginX, y);
  y += 11;
  if (party?.phone) {
    doc.text(party.phone, marginX, y);
    y += 11;
  }

  y += 6;
  if (isSimple) {
    doc.setLineDashPattern([2, 1], 0);
  } else {
    doc.setLineDashPattern([], 0);
  }
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 14;

  doc.setFont("courier", "bold");
  doc.setFontSize(base - 1);
  doc.text("ITEM", marginX, y);
  doc.text("TOTAL", pageWidth - marginX, y, { align: "right" });
  y += 12;

  doc.setFont("courier", "normal");
  for (const item of items) {
    const nameLines = doc.splitTextToSize(item.description, contentWidth - 50);
    doc.text(nameLines, marginX, y);
    doc.text(formatCurrencyForPdf(Number(item.line_total), currency), pageWidth - marginX, y, {
      align: "right",
    });
    y += nameLines.length * 11;
    doc.setFontSize(base - 2);
    doc.text(
      `  ${item.quantity} ${item.unit} x ${formatCurrencyForPdf(Number(item.unit_price), currency)}`,
      marginX,
      y
    );
    y += 11;
    if (item.item_code || (showHsn && item.hsn_code)) {
      const codeParts = [
        item.item_code ? `Code: ${item.item_code}` : null,
        showHsn && item.hsn_code ? `HSN: ${item.hsn_code}` : null,
      ].filter(Boolean);
      doc.text(`  ${codeParts.join("  ")}`, marginX, y);
      y += 11;
    }
    doc.setFontSize(base - 1);
    y += 2;
  }

  y += 4;
  if (isSimple) {
    doc.setLineDashPattern([2, 1], 0);
  } else {
    doc.setLineDashPattern([], 0);
    doc.setLineWidth(1.2);
  }
  doc.line(marginX, y, pageWidth - marginX, y);
  doc.setLineWidth(1);
  y += 14;

  doc.text("Subtotal", marginX, y);
  doc.text(formatCurrencyForPdf(subtotal, currency), pageWidth - marginX, y, { align: "right" });
  y += 12;

  if (gstEnabled) {
    doc.text(`GST (${gstPercent}%)`, marginX, y);
    doc.text(formatCurrencyForPdf(gstAmount, currency), pageWidth - marginX, y, { align: "right" });
    y += 12;
  }

  doc.setFont("courier", "bold");
  doc.setFontSize(base + 1);
  doc.text("TOTAL", marginX, y);
  doc.text(formatCurrencyForPdf(total, currency), pageWidth - marginX, y, { align: "right" });
  y += 16;

  if (currency === "INR") {
    doc.setFont("courier", "normal");
    doc.setFontSize(base - 2);
    const wordsLines = doc.splitTextToSize(
      `Amount in words: ${amountToWordsINR(total)}`,
      contentWidth
    );
    doc.text(wordsLines, marginX, y);
    y += wordsLines.length * 10 + 10;
  }

  if (notes) {
    doc.setFont("courier", "normal");
    doc.setFontSize(base - 2);
    const noteLines = doc.splitTextToSize(notes, contentWidth);
    doc.text(noteLines, marginX, y);
    y += noteLines.length * 10 + 10;
  }

  if (terms) {
    doc.setLineDashPattern(isSimple ? [2, 1] : [], 0);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 12;
    doc.setFont("courier", "bold");
    doc.setFontSize(base - 2);
    doc.text("Terms & Conditions", marginX, y);
    y += 11;
    doc.setFont("courier", "normal");
    const termsLines = doc.splitTextToSize(terms, contentWidth);
    doc.text(termsLines, marginX, y);
    y += termsLines.length * 10 + 14;
  }

  const bankLines = [
    bankDetails?.bankName ? `Bank: ${bankDetails.bankName}` : null,
    bankDetails?.accountName ? `A/c name: ${bankDetails.accountName}` : null,
    bankDetails?.accountNumber ? `A/c no: ${bankDetails.accountNumber}` : null,
    bankDetails?.ifscOrSwift ? `IFSC/SWIFT: ${bankDetails.ifscOrSwift}` : null,
  ].filter((l): l is string => Boolean(l));
  if (bankLines.length > 0) {
    doc.setLineDashPattern(isSimple ? [2, 1] : [], 0);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 12;
    doc.setFont("courier", "bold");
    doc.setFontSize(base - 2);
    doc.text("Payment details", marginX, y);
    y += 11;
    doc.setFont("courier", "normal");
    for (const line of bankLines) {
      doc.text(line, marginX, y);
      y += 10;
    }
    y += 4;
  }

  doc.setFont("courier", "normal");
  doc.text("Authorized Signatory: ____________", marginX, y);
  y += 16;

  doc.setFont("courier", "normal");
  doc.setFontSize(base - 2);
  doc.text("Generated with Zen Biz", pageWidth / 2, y, { align: "center" });

  if (planFeatures.invoiceWatermark) {
    y += 12;
    doc.setFont("courier", "italic");
    doc.setFontSize(base - 3);
    doc.setTextColor(180, 175, 165);
    doc.text("Unwatermarked receipts on Professional+", pageWidth / 2, y, {
      align: "center",
    });
  }

  doc.save(`${filenamePrefix}-${docNumber}.pdf`);
}
