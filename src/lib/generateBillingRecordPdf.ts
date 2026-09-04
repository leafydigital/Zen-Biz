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
// width follows common POS printer standards; height grows with content
// so it isn't a fixed page size the way A4/A5 are.
const PAPER_DIMENSIONS: Record<string, { width: number; height: number | "auto" }> = {
  a4: { width: 595, height: 842 },
  a5: { width: 420, height: 595 },
  thermal: { width: 227, height: "auto" }, // 80mm
  thermal58: { width: 164, height: "auto" }, // 58mm
};

/**
 * jsPDF's addImage needs raw image data, not a remote URL — this fetches
 * the signature/seal/logo image and converts it to a base64 data URL so it
 * can be embedded directly in the PDF. Returns null on any failure so the
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

/** Zen Biz brand palette for the redesigned document — navy text, blue
 * accent, very light borders. Kept as plain RGB tuples since jsPDF's color
 * setters take numbers, not CSS strings. */
const BRAND = {
  navy: [23, 37, 84] as [number, number, number],
  navySoft: [71, 85, 105] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  blueDark: [29, 78, 216] as [number, number, number],
  lightBlueBg: [239, 246, 255] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  borderLight: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [16, 185, 129] as [number, number, number],
  successBg: [236, 253, 245] as [number, number, number],
  warn: [217, 119, 6] as [number, number, number],
  warnBg: [255, 251, 235] as [number, number, number],
  green: [5, 150, 105] as [number, number, number],
  greenBg: [236, 253, 245] as [number, number, number],
  orange: [194, 65, 12] as [number, number, number],
  orangeBg: [255, 247, 237] as [number, number, number],
};

/** Monochrome palette used when style === "thermal_simple" — pure
 * black/grey, ink-friendly and neutral for printing on any office
 * printer, with no reliance on colour at all. */
const MONO = {
  navy: [26, 26, 26] as [number, number, number],
  navySoft: [90, 90, 90] as [number, number, number],
  blue: [26, 26, 26] as [number, number, number],
  blueDark: [26, 26, 26] as [number, number, number],
  lightBlueBg: [245, 245, 245] as [number, number, number],
  border: [210, 210, 210] as [number, number, number],
  borderLight: [235, 235, 235] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [26, 26, 26] as [number, number, number],
  successBg: [240, 240, 240] as [number, number, number],
  warn: [26, 26, 26] as [number, number, number],
  warnBg: [240, 240, 240] as [number, number, number],
  green: [26, 26, 26] as [number, number, number],
  greenBg: [240, 240, 240] as [number, number, number],
  orange: [26, 26, 26] as [number, number, number],
  orangeBg: [240, 240, 240] as [number, number, number],
};

function statusPalette(status: string | undefined, colors: typeof BRAND) {
  const s = (status ?? "").toLowerCase();
  if (s === "paid" || s === "accepted" || s === "delivered") {
    return { bg: colors.successBg, fg: colors.success };
  }
  if (s === "cancelled" || s === "rejected") {
    return { bg: colors.warnBg, fg: colors.warn };
  }
  // unpaid / partial / draft / sent / dispatched / anything else
  return { bg: colors.lightBlueBg, fg: colors.blue };
}

/**
 * Shared layout engine for every "sale-style" document Zen Biz produces —
 * invoices, quotations, and purchases. `design` controls paper size, visual
 * style, and font size independently for each document type, since a shop
 * owner might want A4 default invoices but thermal receipts for quotations
 * (or any other combination).
 */
export async function generateBillingRecordDocumentPdf({
  docLabel,
  docNumber,
  docDate,
  dueDate,
  status,
  paymentMethod,
  taxType,
  placeOfSupply,
  partyLabel,
  party,
  shipTo,
  items,
  subtotal,
  discountAmount,
  gstEnabled,
  gstPercent,
  gstAmount,
  cgstAmount,
  sgstAmount,
  igstAmount,
  roundOff,
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
  /** Cash / UPI / Bank / Card / Cheque / Other, shown in the info box. */
  paymentMethod?: string | null;
  /** The actual selected tax mode ("gst" | "non_gst" | "tax" | "non_tax",
   * or a legacy value) — used only to label the info box and decide
   * whether to show a tax row at all, never to recompute any amount. */
  taxType?: string;
  /** State name shown as "Place of Supply", when known. */
  placeOfSupply?: string | null;
  partyLabel: string;
  party: PdfPartyInfo | null;
  shipTo?: { name?: string | null; address?: string | null } | null;
  items: PdfLineItem[];
  subtotal: number;
  /** Optional — a document-level discount already deducted from subtotal. */
  discountAmount?: number;
  gstEnabled: boolean;
  gstPercent: number;
  gstAmount: number;
  // Optional — when provided, the PDF shows a CGST/SGST/IGST breakdown
  // instead of one lump "GST" line, matching how Indian tax invoices are
  // normally read. If omitted, falls back to showing gstAmount as IGST.
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  /** Optional rounding adjustment applied to reach `total`. */
  roundOff?: number;
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
    upiId?: string | null;
  } | null;
  qrUrl?: string | null;
}) {
  if (design.paperSize === "thermal" || design.paperSize === "thermal58") {
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
      cgstAmount,
      sgstAmount,
      igstAmount,
      roundOff,
      total,
      notes,
      profile,
      filenamePrefix,
      paperSize: design.paperSize,
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
    paymentMethod,
    taxType,
    placeOfSupply,
    partyLabel,
    party,
    shipTo,
    items,
    subtotal,
    discountAmount,
    gstEnabled,
    gstPercent,
    gstAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff,
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
// Standard layout — used for A4 and A5. A4 uses the full design; A5 scales
// margins and type down proportionally rather than just shrinking text.
// Multi-page: the items table (via autoTable) breaks across pages and
// repeats its header automatically. Everything drawn after the table
// checks remaining space and starts a fresh page rather than overflowing.
// ---------------------------------------------------------------------------
async function renderStandardPdf(args: {
  docLabel: string;
  docNumber: string;
  docDate: string;
  dueDate?: string | null;
  status?: string;
  paymentMethod?: string | null;
  taxType?: string;
  placeOfSupply?: string | null;
  partyLabel: string;
  party: PdfPartyInfo | null;
  shipTo?: { name?: string | null; address?: string | null } | null;
  items: PdfLineItem[];
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
    upiId?: string | null;
  } | null;
  qrUrl?: string | null;
}) {
  const {
    docLabel, docNumber, docDate, dueDate, status, paymentMethod, taxType, placeOfSupply,
    partyLabel, party, shipTo, items, subtotal,
    discountAmount = 0, gstEnabled, gstPercent, gstAmount, cgstAmount = 0, sgstAmount = 0, igstAmount = 0,
    roundOff = 0, total, notes, profile, filenamePrefix,
    paperSize, fontSize, style, terms, signatureUrl, currency = "INR", bankDetails, qrUrl,
  } = args;

  const isMono = style === "thermal_simple";
  const colors = isMono ? MONO : BRAND;

  const dims = PAPER_DIMENSIONS[paperSize];
  const scale = paperSize === "a5" ? 0.75 : 1;
  const pageWidth = dims.width as number;
  const pageHeight = dims.height as number;
  const marginX = 40 * scale;
  const rightX = pageWidth - marginX;
  const bottomLimit = pageHeight - 58 * scale; // keep clear of the footer band

  const doc = new jsPDF({ unit: "pt", format: [dims.width, dims.height as number] });

  const base = fontSize;
  const titleSize = base + 15;
  const smallSize = Math.max(base - 1.5, 7.5);
  const tinySize = Math.max(base - 2.5, 7);

  const planFeatures = getPlanFeatures(profile.plan);
  const showHsn = planFeatures.gstBilling;
  const showWatermark = planFeatures.invoiceWatermark;

  let pageNum = 1;

  /** Starts a new page and returns the y-coordinate to resume drawing at. */
  function newPage(): number {
    doc.addPage([dims.width, dims.height as number]);
    pageNum += 1;
    return 40 * scale;
  }

  /** Ensures `neededHeight` points remain before the bottom margin; if not,
   * starts a new page and returns the (possibly reset) y position. */
  function ensureSpace(currentY: number, neededHeight: number): number {
    if (currentY + neededHeight > bottomLimit) {
      return newPage();
    }
    return currentY;
  }

  let y = 46 * scale;

  // ---- Header: logo + business identity (left), big document title
  // and a bordered info card (right). Spacing here is deliberately
  // generous rather than tightly fitted to one font's exact metrics —
  // a short title like "BILL" and a long one like "QUOTATION" both
  // need to sit cleanly clear of the logo above and the meta box
  // below, without the layout depending on precisely how tall any one
  // piece of text renders. ----
  let textStartX = marginX;
  let logoBottom = y;
  if (profile.logo_url) {
    // Scale the logo to the title text height rather than a fixed size —
    // a fixed 42pt logo reads as oversized next to a small fontSize
    // setting, and undersized next to a large one.
    const logoSize = Math.min(Math.max(titleSize * 1.3, 26), 40) * scale;
    try {
      const logoData = await loadImageAsDataUrl(profile.logo_url);
      if (logoData) {
        doc.addImage(logoData, marginX, y, logoSize, logoSize);
        textStartX = marginX + logoSize + 14 * scale;
      }
    } catch {
      // Falls back to text-only header if the logo can't be loaded.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleSize);
  doc.setTextColor(...colors.navy);
  const leftColWidth = 220 * scale;
  const businessNameLines = doc.splitTextToSize(profile.business_name || "Your Business", leftColWidth);
  const nameBaselineY = y + titleSize * 0.78;
  doc.text(businessNameLines, textStartX, nameBaselineY);
  let leftY = nameBaselineY + (businessNameLines.length - 1) * (titleSize + 2) + 18 * scale;
  logoBottom = leftY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(smallSize);
  doc.setTextColor(...colors.navySoft);
  if (profile.address) {
    const addrLines = doc.splitTextToSize(profile.address, leftColWidth);
    doc.text(addrLines, textStartX, leftY);
    leftY += addrLines.length * 11.5 * scale;
  }
  const contactBits: string[] = [];
  if (profile.phone) contactBits.push(profile.phone);
  if (contactBits.length) {
    // A small extra gap here (on top of the normal line step) separates
    // the phone number from the address block above it, so it doesn't
    // read as just another address line.
    if (profile.address) leftY += 4 * scale;
    doc.text(contactBits.join("   |   "), textStartX, leftY);
    leftY += 11.5 * scale;
  }
  if (profile.gst_number) {
    doc.text(`GSTIN: ${profile.gst_number}`, textStartX, leftY);
    leftY += 11.5 * scale;
  }

  // Right: document title as a solid navy pill — reads as a strong,
  // premium label regardless of word length, since the pill's own
  // padding (not the word) sets its shape.
  const titleFontSize = titleSize - 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleFontSize);
  const titlePadX = 16 * scale;
  const titlePillHeight = titleFontSize + 14 * scale;
  const titleTextWidth = doc.getTextWidth(docLabel);
  const titlePillWidth = titleTextWidth + titlePadX * 2;
  const titlePillX = rightX - titlePillWidth;
  const titlePillY = y - 4 * scale;
  doc.setFillColor(...colors.navy);
  doc.roundedRect(titlePillX, titlePillY, titlePillWidth, titlePillHeight, 7 * scale, 7 * scale, "F");
  doc.setTextColor(...colors.white);
  doc.text(docLabel, rightX - titlePadX, titlePillY + titlePillHeight / 2 + titleFontSize * 0.32, {
    align: "right",
  });

  const taxTypeLabel: Record<string, string> = {
    gst: `GST${gstPercent ? ` ${gstPercent}%` : ""}`,
    non_gst: "Non-GST",
    tax: `Tax${gstPercent ? ` ${gstPercent}%` : ""}`,
    non_tax: "Non-Tax",
    // Legacy values, kept so older saved documents still show something
    // sensible rather than nothing.
    inclusive: `GST${gstPercent ? ` ${gstPercent}%` : ""}`,
    exclusive: `GST${gstPercent ? ` ${gstPercent}%` : ""}`,
    exempt: "Non-GST",
  };

  // A single compact info card holds document number, date, status, and
  // — folded in as ordinary rows rather than a separate heading block —
  // payment mode, tax type, and place of supply. Keeping this as one
  // card instead of two removes roughly 140pt of header height that
  // was pushing normal single-page documents onto a second page for no
  // real reason, and matches the request that tax type read as a plain
  // field here, not a prominent standalone line.
  const metaRows: [string, string][] = [
    [docLabel === "PURCHASE" ? "Purchase No." : `${docLabel.charAt(0)}${docLabel.slice(1).toLowerCase()} No.`, docNumber],
    ["Date", docDate],
  ];
  if (status) metaRows.push(["Payment Status", status.toUpperCase()]);
  if (dueDate) metaRows.push([docLabel === "QUOTATION" ? "Valid Until" : "Due Date", dueDate]);
  if (paymentMethod) {
    metaRows.push(["Payment Mode", paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1).replace(/_/g, " ")]);
  }
  if (taxType) metaRows.push(["Tax Type", taxTypeLabel[taxType] ?? taxType]);
  if (placeOfSupply) metaRows.push(["Place of Supply", placeOfSupply]);

  const metaBoxWidth = 225 * scale;
  const metaRowHeight = 16 * scale;
  const metaPad = 10 * scale;
  const metaBoxX = rightX - metaBoxWidth;
  let metaY = titlePillY + titlePillHeight + 10 * scale;
  const metaBoxHeight = metaRowHeight * metaRows.length + metaPad * 2 - 4 * scale;

  doc.setDrawColor(...colors.border);
  doc.setLineWidth(1);
  doc.setFillColor(...colors.white);
  doc.roundedRect(metaBoxX, metaY, metaBoxWidth, metaBoxHeight, 8 * scale, 8 * scale, "FD");

  let rowY = metaY + metaPad + tinySize * 0.6;
  doc.setFontSize(tinySize);
  metaRows.forEach(([label, value], i) => {
    const isStatusRow = label === "Payment Status";
    const pal = isStatusRow ? statusPalette(status, colors) : null;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...colors.navySoft);
    doc.text(label, metaBoxX + metaPad, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...(pal ? pal.fg : colors.navy));
    doc.text(value, metaBoxX + metaBoxWidth - metaPad, rowY, { align: "right" });
    if (i < metaRows.length - 1) {
      doc.setDrawColor(...colors.borderLight);
      doc.setLineWidth(0.75);
      doc.line(metaBoxX + metaPad, rowY + metaRowHeight - tinySize * 0.6, metaBoxX + metaBoxWidth - metaPad, rowY + metaRowHeight - tinySize * 0.6);
    }
    rowY += metaRowHeight;
  });

  y = Math.max(logoBottom, leftY, metaY + metaBoxHeight) + 16 * scale;

  // ---- Bill To / Ship To — light bordered card(s) ----
  const partyGap = 12 * scale;
  const partyColWidth = shipTo ? (rightX - marginX - partyGap) / 2 : rightX - marginX;

  function measurePartyBlockHeight(
    label: string,
    info: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null; gstin?: string | null } | null,
    width: number
  ): number {
    const innerWidth = width - 20 * scale;
    // Header row now holds a 20pt icon badge (10pt top padding + 20pt
    // badge + 12pt gap before the name), taller than the old plain text
    // label row — must match renderPartyCard's actual layout exactly or
    // the card either clips the name or leaves an unexplained gap.
    let h = 32 * scale;
    const nameLines = doc.splitTextToSize(info?.name || "Not specified", innerWidth);
    h += nameLines.length * 13 * scale;
    if (info?.address) {
      const lines = doc.splitTextToSize(info.address, innerWidth);
      h += lines.length * 11 * scale;
    }
    if (info?.phone) h += 11 * scale;
    if (info?.email) h += 11 * scale;
    if (info?.gstin) h += 11 * scale;
    return h + 16 * scale; // bottom card padding (top padding already counted above)
  }

  function renderPartyCard(
    label: string,
    info: { name?: string | null; address?: string | null; phone?: string | null; email?: string | null; gstin?: string | null } | null,
    x: number,
    width: number,
    topY: number
  ): number {
    const innerWidth = width - 20 * scale;
    const cardHeight = measurePartyBlockHeight(label, info, width);

    doc.setFillColor(...colors.lightBlueBg);
    doc.setDrawColor(...colors.border);
    doc.roundedRect(x, topY, width, cardHeight, 6 * scale, 6 * scale, "FD");

    // Small circular icon badge next to the section label, matching the
    // reference's "person" icon for Bill To / Ship To / Supplier.
    const badgeSize = 20 * scale;
    const badgeCx = x + 10 * scale + badgeSize / 2;
    const badgeCy = topY + 10 * scale + badgeSize / 2;
    doc.setFillColor(...colors.blue);
    doc.circle(badgeCx, badgeCy, badgeSize / 2, "F");
    doc.setDrawColor(...colors.white);
    doc.setLineWidth(1.2);
    doc.circle(badgeCx, badgeCy - badgeSize * 0.12, badgeSize * 0.16, "S");
    doc.setLineWidth(1);
    doc.line(badgeCx - badgeSize * 0.22, badgeCy + badgeSize * 0.28, badgeCx - badgeSize * 0.1, badgeCy + badgeSize * 0.05);
    doc.line(badgeCx - badgeSize * 0.1, badgeCy + badgeSize * 0.05, badgeCx + badgeSize * 0.1, badgeCy + badgeSize * 0.05);
    doc.line(badgeCx + badgeSize * 0.1, badgeCy + badgeSize * 0.05, badgeCx + badgeSize * 0.22, badgeCy + badgeSize * 0.28);

    const labelX = x + 14 * scale + badgeSize;
    let py = topY + 10 * scale + smallSize;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(tinySize + 1);
    doc.setTextColor(...colors.blue);
    doc.text(label.toUpperCase(), labelX, topY + badgeCy - topY - 2 * scale + tinySize * 0.35);
    py = topY + 10 * scale + badgeSize + 12 * scale;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(base);
    doc.setTextColor(...colors.navy);
    const nameLines = doc.splitTextToSize(info?.name || "Not specified", innerWidth);
    doc.text(nameLines, x + 10 * scale, py);
    py += nameLines.length * 13 * scale;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(smallSize);
    doc.setTextColor(...colors.navySoft);
    if (info?.address) {
      const lines = doc.splitTextToSize(info.address, innerWidth);
      doc.text(lines, x + 10 * scale, py);
      py += lines.length * 11 * scale;
    }
    if (info?.phone) {
      doc.text(`Phone: ${info.phone}`, x + 10 * scale, py);
      py += 11 * scale;
    }
    if (info?.email) {
      doc.text(info.email, x + 10 * scale, py);
      py += 11 * scale;
    }
    if (info?.gstin) {
      doc.text(`GSTIN: ${info.gstin}`, x + 10 * scale, py);
      py += 11 * scale;
    }

    return topY + cardHeight;
  }

  const billCardHeight = measurePartyBlockHeight(partyLabel, party, partyColWidth);
  const shipCardHeight = shipTo ? measurePartyBlockHeight("Ship To", shipTo, partyColWidth) : 0;
  y = ensureSpace(y, Math.max(billCardHeight, shipCardHeight) + 10 * scale);

  const billBottom = renderPartyCard(partyLabel, party, marginX, partyColWidth, y);
  let shipBottom = billBottom;
  if (shipTo) {
    shipBottom = renderPartyCard("Ship To", shipTo, marginX + partyColWidth + partyGap, partyColWidth, y);
  }
  y = Math.max(billBottom, shipBottom) + 18 * scale;

  // ---- Items table ----
  const hasAnyTax = items.some((it) => Number(it.tax_percent ?? 0) > 0);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "#",
        "Item / Description",
        ...(showHsn ? ["HSN/SAC"] : []),
        "Qty",
        "Unit Price",
        ...(hasAnyTax ? ["Tax"] : []),
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
    styles: {
      fontSize: smallSize,
      cellPadding: 7 * scale,
      textColor: colors.navy,
      lineColor: colors.border,
      lineWidth: 0.75,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: colors.navy,
      textColor: colors.white,
      fontStyle: "bold",
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: colors.borderLight },
    columnStyles: (() => {
      // Column order is always: # , Item , [HSN] , Qty , Unit Price ,
      // [Tax] , Amount. Every column gets an explicit width — leaving any
      // column unconstrained lets autoTable's auto-sizing squeeze the
      // Item/Description column against a wide Amount value, or let a
      // long description push the numeric columns toward the page edge.
      // Fixed-width numeric columns are sized generously enough for real
      // currency values (e.g. "Rs. 1,23,456.00") without wrapping; the
      // Item column absorbs whatever width is left over.
      const numCol = 62 * scale; // Qty / Unit Price / Amount
      const hsnCol = 50 * scale;
      const taxCol = 42 * scale;
      const hashCol = 22 * scale;

      let idx = 0;
      const col: Record<number, { cellWidth?: number | "auto"; halign?: "left" | "center" | "right" }> = {};
      col[idx] = { cellWidth: hashCol }; // #
      idx += 1;
      col[idx] = { cellWidth: "auto" }; // Item / Description — takes remaining space
      idx += 1;
      if (showHsn) {
        col[idx] = { cellWidth: hsnCol };
        idx += 1;
      }
      col[idx] = { cellWidth: numCol, halign: "right" }; // Qty
      idx += 1;
      col[idx] = { cellWidth: numCol, halign: "right" }; // Unit Price
      idx += 1;
      if (hasAnyTax) {
        col[idx] = { cellWidth: taxCol, halign: "center" }; // Tax
        idx += 1;
      }
      col[idx] = { cellWidth: numCol, halign: "right" }; // Amount
      return col;
    })(),
    margin: { left: marginX, right: pageWidth - rightX, bottom: 40 * scale },
    didDrawPage: () => {
      // autoTable repeats the head row on every new page automatically;
      // nothing extra to do here, this hook exists only so page breaks
      // inside the table are visible to future maintainers reading this.
    },
  });

  // @ts-expect-error - lastAutoTable is added by the plugin at runtime
  let afterTableY: number = doc.lastAutoTable.finalY + 18 * scale;
  // autoTable may have started new pages internally; keep our own page
  // counter in sync so anything drawn after the table (which uses
  // doc.setPage / newPage) lands on the right page.
  pageNum = doc.getNumberOfPages();
  doc.setPage(pageNum);

  // ---- Totals summary card (right-aligned, only non-zero rows shown) ----
  const totalLineTax = items.reduce(
    (sum, it) => sum + Number(it.line_total) * (Number(it.tax_percent ?? 0) / 100),
    0
  );
  const distinctTaxRates = Array.from(
    new Set(items.filter((it) => Number(it.tax_percent ?? 0) > 0).map((it) => Number(it.tax_percent)))
  );
  const perLineTaxLabel =
    distinctTaxRates.length === 1 ? `Tax (${distinctTaxRates[0]}%)` : "Tax";
  const hasGstSplit = cgstAmount > 0 || sgstAmount > 0 || igstAmount > 0;

  type TotalRow = { label: string; value: number; emphasis?: boolean };
  const totalRows: TotalRow[] = [{ label: "Subtotal", value: subtotal }];
  if (discountAmount > 0) totalRows.push({ label: "Discount", value: -discountAmount });
  if (!hasGstSplit && totalLineTax > 0) totalRows.push({ label: perLineTaxLabel, value: totalLineTax });
  if (cgstAmount > 0) totalRows.push({ label: "CGST", value: cgstAmount });
  if (sgstAmount > 0) totalRows.push({ label: "SGST", value: sgstAmount });
  if (igstAmount > 0) totalRows.push({ label: "IGST", value: igstAmount });
  if (!hasGstSplit && igstAmount === 0 && cgstAmount === 0 && sgstAmount === 0 && gstEnabled && gstAmount > 0) {
    // This only fires when the per-line tax rows above found nothing
    // (totalLineTax === 0) but a document-level tax amount was still
    // supplied — use the same generically-derived label rather than a
    // hardcoded "GST" string, so a flat Tax-mode document never shows a
    // misleading "GST (X%)" row.
    const fallbackLabel = distinctTaxRates.length === 1 ? `Tax (${distinctTaxRates[0]}%)` : `Tax (${gstPercent}%)`;
    totalRows.push({ label: fallbackLabel, value: gstAmount });
  }
  if (roundOff !== 0) totalRows.push({ label: "Round Off", value: roundOff });

  const totalsBoxWidth = 230 * scale;
  const totalsRowHeight = 16 * scale;
  const totalsPad = 12 * scale;
  const totalRowBoxHeight = 24 * scale;
  const totalsBoxHeight =
    totalsPad * 2 + totalRows.length * totalsRowHeight + 6 * scale + totalRowBoxHeight;
  const totalsBoxX = rightX - totalsBoxWidth;

  afterTableY = ensureSpace(afterTableY, totalsBoxHeight + 10 * scale);

  doc.setDrawColor(...colors.border);
  doc.setLineWidth(1);
  doc.roundedRect(totalsBoxX, afterTableY, totalsBoxWidth, totalsBoxHeight, 6 * scale, 6 * scale, "S");

  let trY = afterTableY + totalsPad + smallSize;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(smallSize);
  for (const row of totalRows) {
    doc.setTextColor(...colors.navySoft);
    doc.text(row.label, totalsBoxX + totalsPad, trY);
    doc.setTextColor(...colors.navy);
    const shown =
      row.value < 0
        ? `-${formatCurrencyForPdf(Math.abs(row.value), currency)}`
        : formatCurrencyForPdf(row.value, currency);
    doc.text(shown, totalsBoxX + totalsBoxWidth - totalsPad, trY, { align: "right" });
    trY += totalsRowHeight;
  }

  trY += 4 * scale;
  const totalBarY = trY - totalsRowHeight / 2 - 2 * scale;
  doc.setFillColor(...colors.navy);
  doc.roundedRect(totalsBoxX, totalBarY, totalsBoxWidth, totalRowBoxHeight, 5 * scale, 5 * scale, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(base + 1.5);
  doc.setTextColor(...colors.white);
  doc.text("TOTAL", totalsBoxX + totalsPad, totalBarY + totalRowBoxHeight / 2 + 4 * scale);
  doc.text(
    formatCurrencyForPdf(total, currency),
    totalsBoxX + totalsBoxWidth - totalsPad,
    totalBarY + totalRowBoxHeight / 2 + 4 * scale,
    { align: "right" }
  );

  afterTableY = afterTableY + totalsBoxHeight + 20 * scale;

  // ---- Amount in words — its own clearly-labelled block, full width,
  // below both the table and the totals card (INR only — the "Rupees ...
  // Only" phrasing is India-specific and a multi-currency version isn't
  // built yet). ----
  if (currency === "INR") {
    afterTableY = ensureSpace(afterTableY, 34 * scale);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(tinySize);
    doc.setTextColor(...colors.blue);
    doc.text("AMOUNT IN WORDS", marginX, afterTableY);
    afterTableY += 13 * scale;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(smallSize);
    doc.setTextColor(...colors.navy);
    const wordsLines = doc.splitTextToSize(amountToWordsINR(total), pageWidth - marginX * 2);
    doc.text(wordsLines, marginX, afterTableY);
    afterTableY += wordsLines.length * 12 * scale + 8 * scale;
  }

  // Small, subtle "Generated by Zen Biz" watermark — Starter plan only.
  // Sits directly under Amount in Words (or in the same spot when there's
  // no Amount in Words block, e.g. non-INR currency), not as a giant
  // diagonal stamp and not buried in the page footer, so it's visible
  // without being distracting or interfering with the printed figures.
  if (showWatermark) {
    afterTableY = ensureSpace(afterTableY, 16 * scale);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(smallSize - 1.5);
    doc.setTextColor(158, 158, 158);
    doc.text("Generated by Zen Biz", marginX, afterTableY);
    afterTableY += 14 * scale;
  }

  // ---- Notes (if any) ----
  if (notes) {
    afterTableY = ensureSpace(afterTableY, 30 * scale);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(tinySize);
    doc.setTextColor(...colors.blue);
    doc.text("NOTES", marginX, afterTableY);
    afterTableY += 13 * scale;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(smallSize);
    doc.setTextColor(...colors.navySoft);
    const noteLines = doc.splitTextToSize(notes, pageWidth - marginX * 2);
    doc.text(noteLines, marginX, afterTableY);
    afterTableY += noteLines.length * 12 * scale + 10 * scale;
  }

  // ---- Three-column footer cards: Payment Information (green), Bank
  // Details (blue), Terms & Conditions (orange) — each only shown when
  // it has real content, and each independently sized to its own
  // content so a short Payment Information card never gets padded out
  // to match a long Terms block. ----
  const hasBankDetails =
    bankDetails &&
    (bankDetails.bankName || bankDetails.accountName || bankDetails.accountNumber || bankDetails.ifscOrSwift || bankDetails.upiId);
  const hasPaymentInfo = Boolean(status) || Boolean(paymentMethod) || Boolean(dueDate);

  const footerCards: { key: string; title: string; accent: [number, number, number]; accentBg: [number, number, number]; lines: string[] }[] = [];

  if (hasPaymentInfo) {
    const lines: string[] = [];
    if (status) lines.push(`Payment Status: ${status.charAt(0).toUpperCase()}${status.slice(1).toLowerCase()}`);
    if (paymentMethod) lines.push(`Payment Mode: ${paymentMethod.charAt(0).toUpperCase()}${paymentMethod.slice(1).replace(/_/g, " ")}`);
    if (dueDate) lines.push(`Due Date: ${dueDate}`);
    footerCards.push({ key: "payment", title: "Payment Information", accent: colors.green, accentBg: colors.greenBg, lines });
  }
  if (hasBankDetails) {
    const lines = [
      bankDetails?.bankName ? `Bank Name: ${bankDetails.bankName}` : null,
      bankDetails?.accountName ? `A/C Name: ${bankDetails.accountName}` : null,
      bankDetails?.accountNumber ? `A/C No: ${bankDetails.accountNumber}` : null,
      bankDetails?.ifscOrSwift ? `IFSC: ${bankDetails.ifscOrSwift}` : null,
      bankDetails?.upiId ? `UPI: ${bankDetails.upiId}` : null,
    ].filter((l): l is string => Boolean(l));
    footerCards.push({ key: "bank", title: "Bank Details", accent: colors.blue, accentBg: colors.lightBlueBg, lines });
  }
  if (terms) {
    footerCards.push({ key: "terms", title: "Terms & Conditions", accent: colors.orange, accentBg: colors.orangeBg, lines: [] });
  }

  if (footerCards.length > 0) {
    const cardGap = 10 * scale;
    const cardCount = footerCards.length;
    const cardWidth = (rightX - marginX - cardGap * (cardCount - 1)) / cardCount;
    const cardPad = 12 * scale;
    const cardInnerWidth = cardWidth - cardPad * 2;

    // Terms wraps to the card's own width, computed only now that we
    // know how wide each card actually is.
    const termsLines = terms ? doc.splitTextToSize(terms, cardInnerWidth) : [];
    const termsCard = footerCards.find((c) => c.key === "terms");

    // Measure each card's own height independently — cards are not
    // forced to match each other's height, matching the reference where
    // a short Payment Information card sits shorter than a longer Terms
    // card.
    function cardBodyLines(card: (typeof footerCards)[number]): string[] {
      if (card.key === "terms") return termsLines;
      return card.lines;
    }
    const cardHeights = footerCards.map((card) => {
      const bodyLines = cardBodyLines(card);
      const lineHeight = card.key === "terms" ? 11 * scale : 13 * scale;
      return cardPad * 2 + 16 * scale + bodyLines.length * lineHeight;
    });
    const rowHeight = Math.max(...cardHeights);

    afterTableY = ensureSpace(afterTableY, rowHeight + 14 * scale);
    afterTableY += 6 * scale;

    footerCards.forEach((card, i) => {
      const cardX = marginX + i * (cardWidth + cardGap);
      const cardHeight = cardHeights[i];

      doc.setFillColor(...card.accentBg);
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(1);
      doc.roundedRect(cardX, afterTableY, cardWidth, cardHeight, 7 * scale, 7 * scale, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(tinySize + 0.5);
      doc.setTextColor(...card.accent);
      doc.text(card.title.toUpperCase(), cardX + cardPad, afterTableY + cardPad + smallSize * 0.6);

      let cy = afterTableY + cardPad + 16 * scale;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(smallSize - 0.5);
      doc.setTextColor(...colors.navySoft);
      const bodyLines = cardBodyLines(card);
      const lineStep = card.key === "terms" ? 11 * scale : 13 * scale;
      for (const line of bodyLines) {
        doc.text(line, cardX + cardPad, cy);
        cy += lineStep;
      }
    });

    afterTableY += rowHeight + 14 * scale;
  }

  // ---- QR code (if provided) — small, left-aligned, with a short label
  // matching the reference's "Scan to Contact" / "Scan to pay" style. ----
  if (qrUrl) {
    const qrSize = 62 * scale;
    afterTableY = ensureSpace(afterTableY, qrSize + 20 * scale);
    try {
      const imageData = await loadImageAsDataUrl(qrUrl);
      if (imageData) {
        doc.addImage(imageData, marginX, afterTableY, qrSize, qrSize);
      }
    } catch {
      // Skip the QR image if it can't be loaded — the rest of the PDF
      // still generates fine.
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(tinySize);
    doc.setTextColor(...colors.navySoft);
    doc.text("Scan to Contact", marginX + qrSize / 2, afterTableY + qrSize + 11 * scale, { align: "center" });
    afterTableY += qrSize + 20 * scale;
  }

  // ---- Signature — bottom-right, "For {Business}" / image (only if one
  // exists) / line / "Authorized Signatory". Reserving a fixed image-sized
  // gap even when there's no signature image wastes real vertical space
  // for the common case (no signature uploaded), so the box only takes
  // its full height when there's an actual image to place. ----
  const sigBoxWidth = 170 * scale;
  const sigBoxHeight = signatureUrl ? 40 * scale : 8 * scale;
  const sigBlockTotalHeight = 9 * scale + 6 * scale + sigBoxHeight + 10 * scale + 9 * scale;
  afterTableY = ensureSpace(afterTableY, sigBlockTotalHeight + 6 * scale);
  const sigX = rightX - sigBoxWidth;
  let sigY = afterTableY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(smallSize);
  doc.setTextColor(...colors.navy);
  doc.text(`For ${profile.business_name || "Your Business"}`, rightX, sigY, { align: "right" });
  sigY += 6 * scale;

  if (signatureUrl) {
    try {
      const imageData = await loadImageAsDataUrl(signatureUrl);
      if (imageData) {
        doc.addImage(imageData, sigX, sigY, sigBoxWidth, sigBoxHeight, undefined, undefined);
      }
    } catch {
      // If the signature image can't be loaded, the PDF still generates
      // fine — just without the image, leaving the line and label.
    }
  }
  sigY += sigBoxHeight;

  doc.setDrawColor(...colors.border);
  doc.setLineWidth(1);
  doc.line(sigX, sigY, rightX, sigY);
  sigY += 10 * scale;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(tinySize);
  doc.setTextColor(...colors.navySoft);
  doc.text("Authorized Signatory", rightX, sigY, { align: "right" });

  afterTableY = Math.max(afterTableY, sigY) + 14 * scale;

  // ---- Footer — drawn on every page: a thin top rule, "Thank you" on the
  // left, "Generated with Zen Biz" on the right. For the Starter plan,
  // append a small watermark note instead of the old huge diagonal
  // "ZEN BIZ" stamp across the page. ----
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const footerY = pageHeight - 24 * scale;
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.75);
    doc.line(marginX, footerY - 10 * scale, rightX, footerY - 10 * scale);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(tinySize);
    doc.setTextColor(...colors.navySoft);
    doc.text("Thank you for your business.", marginX, footerY);
    doc.text("Generated with Zen Biz", rightX, footerY, { align: "right" });

    if (totalPages > 1) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(tinySize - 1);
      doc.setTextColor(...colors.navySoft);
      doc.text(`Page ${p} of ${totalPages}`, pageWidth / 2, footerY - 10 * scale - 4 * scale, {
        align: "center",
      });
    }
  }

  doc.save(`${filenamePrefix}-${docNumber}.pdf`);
}

// ---------------------------------------------------------------------------
// Thermal layout — narrow single-column receipt style for 58mm and 80mm
// printers. Height grows with content since receipt printers don't use a
// fixed page length. Monochrome by nature (thermal printers can't render
// colour), styled with rules and spacing rather than colour fills.
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
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  roundOff?: number;
  total: number;
  notes?: string | null;
  profile: Profile;
  filenamePrefix: string;
  paperSize: "thermal" | "thermal58";
  fontSize: number;
  style: string;
  terms?: string | null;
  currency?: string;
  bankDetails?: {
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    ifscOrSwift?: string | null;
    upiId?: string | null;
  } | null;
}) {
  const {
    docLabel, docNumber, docDate, status, partyLabel, party, items, subtotal,
    gstEnabled, gstPercent, gstAmount, cgstAmount = 0, sgstAmount = 0, igstAmount = 0,
    roundOff = 0, total, notes, profile, filenamePrefix, paperSize, fontSize, style, terms,
    currency = "INR", bankDetails,
  } = args;

  // Thermal receipts are inherently monochrome — no colour fills, only
  // rule weight and dashed-vs-solid lines distinguish "Default" from
  // "Simple". "Default" uses solid double rules and a boxed TOTAL for a
  // more finished look; "Simple" uses dashed rules throughout for the
  // fastest, most ink-light print.
  const isSimple = style === "thermal_simple";
  const planFeatures = getPlanFeatures(profile.plan);
  const showHsn = planFeatures.gstBilling;
  const showWatermark = planFeatures.invoiceWatermark;
  const is58 = paperSize === "thermal58";

  const pageWidth = PAPER_DIMENSIONS[paperSize].width;
  const marginX = is58 ? 8 : 10;
  const contentWidth = pageWidth - marginX * 2;
  const base = is58 ? Math.max(fontSize - 1, 7) : fontSize;
  const centerX = pageWidth / 2;

  const hasAnyTax = items.some((it) => Number(it.tax_percent ?? 0) > 0);
  const hasGstSplit = cgstAmount > 0 || sgstAmount > 0 || igstAmount > 0;
  const totalLineTax = items.reduce(
    (sum, it) => sum + Number(it.line_total) * (Number(it.tax_percent ?? 0) / 100),
    0
  );

  // Estimate the final page height from content up front (line-by-line)
  // so the generated PDF is trimmed to size rather than left with a large
  // blank tail — thermal receipts have no fixed page length, and unlike
  // A4/A5 there's no page-break mechanism here, so under-estimating this
  // directly clips content off the bottom of the receipt.
  const lineHeight = is58 ? 10 : 11;
  // Fixed content that's always drawn, counted in line-equivalents:
  // business name, up to 3 header contact lines, 2 rules + doc label,
  // meta rows (No/Date/Currency + optional Status), party name, items
  // table header, closing rule, "TOTAL" box, "Thank you" + For Business +
  // Authorized Signatory + Generated with Zen Biz + optional watermark
  // line, plus general line-spacing slop between sections.
  let estimatedLines = 42;
  for (const item of items) {
    const nameLines = Math.ceil(item.description.length / (is58 ? 20 : 26)) || 1;
    estimatedLines += nameLines + 1;
    if (item.item_code || (showHsn && item.hsn_code)) estimatedLines += 1;
  }
  if (profile.address) estimatedLines += Math.ceil(profile.address.length / (is58 ? 24 : 30));
  if (notes) estimatedLines += Math.ceil(notes.length / (is58 ? 24 : 30)) + 1;
  if (terms) estimatedLines += Math.ceil(terms.length / (is58 ? 24 : 30)) + 2;
  if (bankDetails) {
    const bankFieldCount = [
      bankDetails.bankName, bankDetails.accountName, bankDetails.accountNumber,
      bankDetails.ifscOrSwift, bankDetails.upiId,
    ].filter(Boolean).length;
    if (bankFieldCount > 0) estimatedLines += bankFieldCount + 2;
  }
  if (currency === "INR") {
    // "Amount in words:" label + up to ~3 wrapped lines for the amount
    // itself — not previously counted at all.
    estimatedLines += 4;
  }
  totalRowsEstimate: {
    let n = 1; // subtotal
    if (!hasGstSplit && totalLineTax > 0) n += 1;
    if (cgstAmount > 0) n += 1;
    if (sgstAmount > 0) n += 1;
    if (igstAmount > 0) n += 1;
    if (roundOff !== 0) n += 1;
    estimatedLines += n;
  }

  // A generous safety margin on top of the line estimate — better to
  // trim a little blank space at the very bottom (harmless) than to clip
  // real content (a broken receipt).
  const estimatedHeight = Math.max(is58 ? 260 : 300, estimatedLines * lineHeight + 90);
  const doc = new jsPDF({ unit: "pt", format: [pageWidth, estimatedHeight] });

  let y = is58 ? 16 : 20;

  function rule(dashed: boolean, weight = 1) {
    doc.setLineWidth(weight);
    doc.setDrawColor(60, 60, 60);
    if (dashed) doc.setLineDashPattern([2, 1.5], 0);
    else doc.setLineDashPattern([], 0);
    doc.line(marginX, y, pageWidth - marginX, y);
  }

  // ---- Centered header: business name, address, phone, GSTIN ----
  doc.setFont("courier", "bold");
  doc.setFontSize(base + 2);
  doc.setTextColor(20, 20, 20);
  doc.text(profile.business_name || "Your Business", centerX, y, { align: "center" });
  y += is58 ? 12 : 15;

  doc.setFont("courier", "normal");
  doc.setFontSize(base - 1);
  doc.setTextColor(50, 50, 50);
  if (profile.address) {
    const lines = doc.splitTextToSize(profile.address, contentWidth);
    doc.text(lines, centerX, y, { align: "center" });
    y += lines.length * lineHeight;
  }
  if (profile.phone) {
    doc.text(`Tel: ${profile.phone}`, centerX, y, { align: "center" });
    y += lineHeight;
  }
  if (profile.gst_number) {
    doc.text(`GSTIN: ${profile.gst_number}`, centerX, y, { align: "center" });
    y += lineHeight;
  }

  y += 4;
  rule(isSimple, isSimple ? 1 : 1.4);
  y += 14;

  doc.setFont("courier", "bold");
  doc.setFontSize(base + 1);
  doc.text(docLabel, centerX, y, { align: "center" });
  y += 14;

  rule(isSimple, isSimple ? 1 : 1.4);
  y += 13;

  // ---- Meta: No / Date / Currency / Status, label:value pairs ----
  doc.setFont("courier", "normal");
  doc.setFontSize(base - 1);
  function metaLine(label: string, value: string) {
    doc.text(label, marginX, y);
    doc.text(value, pageWidth - marginX, y, { align: "right" });
    y += lineHeight;
  }
  metaLine("No.", docNumber);
  metaLine("Date", docDate);
  metaLine("Currency", currency);
  if (status) metaLine("Status", status.toUpperCase());

  if (party?.name) {
    y += 3;
    doc.setFont("courier", "bold");
    doc.text(`${partyLabel}:`, marginX, y);
    y += lineHeight;
    doc.setFont("courier", "normal");
    const nameLines = doc.splitTextToSize(party.name, contentWidth);
    doc.text(nameLines, marginX, y);
    y += nameLines.length * lineHeight;
    if (party.phone) {
      doc.text(party.phone, marginX, y);
      y += lineHeight;
    }
  }

  y += 4;
  rule(true);
  y += 13;

  // ---- Items ----
  doc.setFont("courier", "bold");
  doc.setFontSize(base - 1);
  doc.text("ITEM", marginX, y);
  doc.text("QTY", pageWidth - marginX - (is58 ? 60 : 75), y, { align: "right" });
  doc.text(is58 ? "AMT" : "RATE/AMT", pageWidth - marginX, y, { align: "right" });
  y += lineHeight + 2;
  rule(true);
  y += 12;

  doc.setFont("courier", "normal");
  for (const item of items) {
    const nameLines = doc.splitTextToSize(item.description, contentWidth - (is58 ? 55 : 70));
    doc.text(nameLines, marginX, y);
    doc.text(String(item.quantity), pageWidth - marginX - (is58 ? 60 : 75), y, { align: "right" });
    doc.text(formatCurrencyForPdf(Number(item.line_total), currency), pageWidth - marginX, y, {
      align: "right",
    });
    y += nameLines.length * lineHeight;

    doc.setFontSize(base - 2);
    doc.setTextColor(90, 90, 90);
    const rateLine = `  ${item.quantity} ${item.unit} x ${formatCurrencyForPdf(Number(item.unit_price), currency)}`;
    doc.text(rateLine, marginX, y);
    y += lineHeight;
    if (item.item_code || (showHsn && item.hsn_code)) {
      const codeParts = [
        item.item_code ? `Code: ${item.item_code}` : null,
        showHsn && item.hsn_code ? `HSN: ${item.hsn_code}` : null,
      ].filter(Boolean);
      doc.text(`  ${codeParts.join("  ")}`, marginX, y);
      y += lineHeight;
    }
    doc.setFontSize(base - 1);
    doc.setTextColor(20, 20, 20);
    y += 2;
  }

  y += 2;
  rule(isSimple, isSimple ? 1 : 1.4);
  y += 13;

  // ---- Totals ----
  doc.setFont("courier", "normal");
  doc.setFontSize(base - 1);
  function totalLine(label: string, value: number, bold = false) {
    doc.setFont("courier", bold ? "bold" : "normal");
    doc.text(label, marginX, y);
    doc.text(formatCurrencyForPdf(value, currency), pageWidth - marginX, y, { align: "right" });
    y += lineHeight + 1;
  }
  totalLine("Subtotal", subtotal);
  if (!hasGstSplit && totalLineTax > 0) totalLine("Tax", totalLineTax);
  if (cgstAmount > 0) totalLine("CGST", cgstAmount);
  if (sgstAmount > 0) totalLine("SGST", sgstAmount);
  if (igstAmount > 0) totalLine("IGST", igstAmount);
  if (!hasGstSplit && !cgstAmount && !sgstAmount && !igstAmount && gstEnabled && gstAmount > 0) {
    totalLine(`Tax (${gstPercent}%)`, gstAmount);
  }
  if (roundOff !== 0) totalLine("Round Off", roundOff);

  y += 3;
  rule(isSimple, isSimple ? 1 : 1.6);
  y += 6;

  if (!isSimple) {
    // Boxed TOTAL row for the Default style, matching the reference's
    // bordered TOTAL — Simple style skips the box for minimal ink use.
    const boxHeight = lineHeight + 10;
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(1.2);
    doc.rect(marginX, y, contentWidth, boxHeight);
    y += boxHeight / 2 + 4;
    doc.setFont("courier", "bold");
    doc.setFontSize(base + 1);
    doc.text("TOTAL", marginX + 6, y);
    doc.text(formatCurrencyForPdf(total, currency), pageWidth - marginX - 6, y, { align: "right" });
    y += boxHeight / 2 + 8;
  } else {
    doc.setFont("courier", "bold");
    doc.setFontSize(base + 1);
    doc.text("TOTAL", marginX, y);
    doc.text(formatCurrencyForPdf(total, currency), pageWidth - marginX, y, { align: "right" });
    y += lineHeight + 8;
  }

  rule(isSimple, isSimple ? 1 : 1.4);
  y += 13;

  // ---- Amount in words (INR only) ----
  if (currency === "INR") {
    doc.setFont("courier", "normal");
    doc.setFontSize(base - 2);
    doc.setTextColor(50, 50, 50);
    doc.text("Amount in words:", marginX, y);
    y += lineHeight;
    const wordsLines = doc.splitTextToSize(amountToWordsINR(total), contentWidth);
    doc.setFont("courier", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text(wordsLines, marginX, y);
    y += wordsLines.length * lineHeight + 6;
  }

  if (notes) {
    doc.setFont("courier", "normal");
    doc.setFontSize(base - 2);
    doc.setTextColor(50, 50, 50);
    const noteLines = doc.splitTextToSize(notes, contentWidth);
    doc.text(noteLines, marginX, y);
    y += noteLines.length * lineHeight + 8;
  }

  const bankLines = [
    bankDetails?.bankName ? `Bank: ${bankDetails.bankName}` : null,
    bankDetails?.accountName ? `A/c Name: ${bankDetails.accountName}` : null,
    bankDetails?.accountNumber ? `A/c No: ${bankDetails.accountNumber}` : null,
    bankDetails?.ifscOrSwift ? `IFSC: ${bankDetails.ifscOrSwift}` : null,
    bankDetails?.upiId ? `UPI: ${bankDetails.upiId}` : null,
  ].filter((l): l is string => Boolean(l));
  if (bankLines.length > 0) {
    rule(true);
    y += 12;
    doc.setFont("courier", "bold");
    doc.setFontSize(base - 1);
    doc.setTextColor(20, 20, 20);
    doc.text("PAYMENT DETAILS", marginX, y);
    y += lineHeight + 2;
    doc.setFont("courier", "normal");
    doc.setFontSize(base - 2);
    doc.setTextColor(50, 50, 50);
    for (const line of bankLines) {
      doc.text(line, marginX, y);
      y += lineHeight;
    }
    y += 4;
  }

  if (terms) {
    rule(true);
    y += 12;
    doc.setFont("courier", "bold");
    doc.setFontSize(base - 1);
    doc.setTextColor(20, 20, 20);
    doc.text("TERMS & CONDITIONS", marginX, y);
    y += lineHeight + 2;
    doc.setFont("courier", "normal");
    doc.setFontSize(base - 2);
    doc.setTextColor(50, 50, 50);
    const termsLines = doc.splitTextToSize(terms, contentWidth);
    doc.text(termsLines, marginX, y);
    y += termsLines.length * lineHeight + 6;
  }

  y += 6;
  rule(isSimple, isSimple ? 1 : 1.4);
  y += 16;

  doc.setFont("courier", "bold");
  doc.setFontSize(base);
  doc.setTextColor(20, 20, 20);
  doc.text("Thank you!", centerX, y, { align: "center" });
  y += lineHeight + 2;

  doc.setFont("courier", "normal");
  doc.setFontSize(base - 1);
  doc.text(`For ${profile.business_name || "Your Business"}`, centerX, y, { align: "center" });
  y += lineHeight;
  doc.setFontSize(base - 2);
  doc.setTextColor(70, 70, 70);
  doc.text("Authorized Signatory", centerX, y, { align: "center" });
  y += lineHeight + 6;

  doc.setFontSize(base - 2);
  doc.setTextColor(90, 90, 90);
  doc.text("Generated with Zen Biz", centerX, y, { align: "center" });

  if (showWatermark) {
    y += lineHeight;
    doc.setFont("courier", "italic");
    doc.setFontSize(base - 3);
    doc.setTextColor(140, 140, 140);
    doc.text("Generated by Zen Biz", centerX, y, { align: "center" });
  }

  doc.save(`${filenamePrefix}-${docNumber}.pdf`);
}
