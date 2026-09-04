import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Customer, DeliveryChallan, DeliveryChallanItem, Profile } from "@/types/database";

// Same palette used by the shared Invoice/Quotation/Purchase/Bill
// generators, kept in sync by hand since Delivery Challan is its own
// small standalone file (no prices or totals belong on a dispatch note).
const NAVY: [number, number, number] = [23, 37, 84];
const NAVY_SOFT: [number, number, number] = [71, 85, 105];
const BLUE: [number, number, number] = [37, 99, 235];
const BORDER: [number, number, number] = [226, 232, 240];
const BORDER_LIGHT: [number, number, number] = [241, 245, 249];
const WHITE: [number, number, number] = [255, 255, 255];

/**
 * jsPDF's addImage needs raw image data, not a remote URL — this fetches
 * the logo and converts it to a base64 data URL so it can be embedded
 * directly in the PDF. Returns null on any failure so the caller can skip
 * the image gracefully rather than breaking PDF generation. Same helper
 * as the one used internally by the shared Invoice/Bill/Quotation/
 * Purchase generator, duplicated here since Delivery Challan is its own
 * standalone file rather than importing from that one.
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
 * Builds a Delivery Challan PDF — a dispatch note for goods sent out, with
 * no prices or totals, since a challan tracks what physically went out, not
 * what it costs. Always A4, since this is a paperwork/dispatch document
 * rather than a customer-facing sale document with design options.
 */
export async function generateDeliveryChallanPdf({
  challan,
  items,
  customer,
  profile,
}: {
  challan: DeliveryChallan;
  items: DeliveryChallanItem[];
  customer: Customer | null;
  profile: Profile;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const rightX = 555;
  const pageHeight = 842;
  const leftColWidth = 230;
  let y = 46;

  // ---- Header: logo (if set) + business name (left, wraps if long) /
  // DELIVERY CHALLAN title + meta box (right) — same generous, fixed
  // spacing as the shared document generator so nothing here ever
  // overlaps regardless of how long the business name or title text is,
  // and the same logo treatment as Invoice/Bill/Quotation/Purchase. ----
  let textStartX = marginX;
  if (profile.logo_url) {
    const logoSize = 30;
    try {
      const logoData = await loadImageAsDataUrl(profile.logo_url);
      if (logoData) {
        doc.addImage(logoData, marginX, y, logoSize, logoSize);
        textStartX = marginX + logoSize + 14;
      }
    } catch {
      // Falls back to text-only header if the logo can't be loaded.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  const businessNameLines = doc.splitTextToSize(profile.business_name || "Your Business", leftColWidth);
  const nameBaselineY = y + 20 * 0.78;
  doc.text(businessNameLines, textStartX, nameBaselineY);
  let leftY = nameBaselineY + (businessNameLines.length - 1) * 22 + 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY_SOFT);
  if (profile.address) {
    const addrLines = doc.splitTextToSize(profile.address, leftColWidth);
    doc.text(addrLines, textStartX, leftY);
    leftY += addrLines.length * 12;
  }
  if (profile.phone) {
    doc.text(`Phone: ${profile.phone}`, textStartX, leftY);
    leftY += 12;
  }

  const titleFontSize = 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleFontSize);
  doc.setTextColor(...NAVY);
  const titleBaselineY = y + titleFontSize * 0.78;
  doc.text("DELIVERY CHALLAN", rightX, titleBaselineY, { align: "right" });

  const metaBoxWidth = 205;
  const metaRowHeight = 18;
  const metaPad = 10;
  const metaRows: [string, string][] = [
    ["Challan No.", challan.challan_number],
    ["Date", challan.challan_date],
    ["Status", challan.status.toUpperCase()],
  ];
  const metaBoxX = rightX - metaBoxWidth;
  const metaY = titleBaselineY + 14;
  const metaBoxHeight = metaRowHeight * metaRows.length + 12;

  doc.setDrawColor(...BLUE);
  doc.setLineWidth(1.6);
  doc.line(metaBoxX, metaY - 6, rightX, metaY - 6);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.setFillColor(...BORDER_LIGHT);
  doc.roundedRect(metaBoxX, metaY, metaBoxWidth, metaBoxHeight, 6, 6, "FD");

  let rowY = metaY + metaPad;
  doc.setFontSize(9.5);
  metaRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...NAVY_SOFT);
    doc.text(label, metaBoxX + metaPad, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(value, metaBoxX + metaBoxWidth - metaPad, rowY, { align: "right" });
    rowY += metaRowHeight;
  });

  y = Math.max(leftY, metaY + metaBoxHeight) + 26;

  // ---- Deliver To — same light-card treatment as Bill To elsewhere,
  // with the customer name wrapped rather than left unbounded. ----
  const cardWidth = rightX - marginX;
  const innerWidth = cardWidth - 20;
  const nameLines = doc.splitTextToSize(customer?.name || "Not specified", innerWidth);
  let cardHeight = 16 + nameLines.length * 13;
  const addrLines = customer?.address ? doc.splitTextToSize(customer.address, innerWidth) : [];
  if (customer?.address) cardHeight += addrLines.length * 11;
  if (customer?.phone) {
    // Small extra gap so the phone number doesn't read as just another
    // address line — matches the same fix applied to Invoice/Bill/
    // Quotation/Purchase's shared recipient card.
    if (customer?.address) cardHeight += 4;
    cardHeight += 11;
  }
  cardHeight += 20;

  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(marginX, y, cardWidth, cardHeight, 6, 6, "FD");

  let py = y + 10 + 9.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLUE);
  doc.text("DELIVER TO", marginX + 10, py);
  py += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(nameLines, marginX + 10, py);
  py += nameLines.length * 13;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY_SOFT);
  if (customer?.address) {
    doc.text(addrLines, marginX + 10, py);
    py += addrLines.length * 11;
  }
  if (customer?.phone) {
    if (customer?.address) py += 4;
    doc.text(`Phone: ${customer.phone}`, marginX + 10, py);
    py += 11;
  }

  y += cardHeight + 20;

  // ---- Items — description gets the majority width, every other
  // column has an explicit width so a long description can't crowd out
  // Qty/Unit or overflow the page. ----
  autoTable(doc, {
    startY: y,
    head: [["#", "Description", "Item Code", "Qty", "Unit"]],
    body: items.map((item, i) => [
      String(i + 1),
      item.description,
      item.item_code || "—",
      String(item.quantity),
      item.unit,
    ]),
    styles: {
      fontSize: 9.5,
      cellPadding: 8,
      textColor: NAVY,
      lineColor: BORDER,
      lineWidth: 0.75,
      overflow: "linebreak",
    },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", lineWidth: 0 },
    alternateRowStyles: { fillColor: BORDER_LIGHT },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 90 },
      3: { cellWidth: 55, halign: "right" },
      4: { cellWidth: 55 },
    },
    margin: { left: marginX, right: 40, bottom: 40 },
  });

  // @ts-expect-error - lastAutoTable is added by the plugin at runtime
  let afterTableY = doc.lastAutoTable.finalY + 26;

  if (challan.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLUE);
    doc.text("NOTES", marginX, afterTableY);
    afterTableY += 13;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...NAVY_SOFT);
    const noteLines = doc.splitTextToSize(challan.notes, rightX - marginX);
    doc.text(noteLines, marginX, afterTableY);
    afterTableY += noteLines.length * 12 + 10;
  }

  afterTableY = Math.min(afterTableY + 24, pageHeight - 90);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(1);
  doc.line(marginX, afterTableY, marginX + 180, afterTableY);
  doc.line(rightX - 180, afterTableY, rightX, afterTableY);
  afterTableY += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY_SOFT);
  doc.text("Dispatched by", marginX, afterTableY);
  doc.text("Received by", rightX - 180, afterTableY);

  const footerY = pageHeight - 24;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.75);
  doc.line(marginX, footerY - 10, rightX, footerY - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY_SOFT);
  doc.text("Generated with Zen Biz", rightX, footerY, { align: "right" });

  doc.save(`Challan-${challan.challan_number}.pdf`);
}
