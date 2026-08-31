import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Customer, DeliveryChallan, DeliveryChallanItem, Profile } from "@/types/database";

/**
 * Builds a Delivery Challan PDF — a dispatch note for goods sent out, with
 * no prices or totals, since a challan tracks what physically went out, not
 * what it costs. Always A4, since this is a paperwork/dispatch document
 * rather than a customer-facing sale document with design options.
 */
export function generateDeliveryChallanPdf({
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
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 61, 62);
  doc.text(profile.business_name || "Your Business", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(86, 82, 72);
  y += 18;
  if (profile.phone) {
    doc.text(`Phone: ${profile.phone}`, marginX, y);
    y += 14;
  }
  if (profile.address) {
    doc.text(profile.address, marginX, y);
    y += 14;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 61, 62);
  doc.text("DELIVERY CHALLAN", rightX, 50, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 26);
  doc.text(`No: ${challan.challan_number}`, rightX, 68, { align: "right" });
  doc.text(`Date: ${challan.challan_date}`, rightX, 82, { align: "right" });
  doc.text(`Status: ${challan.status.toUpperCase()}`, rightX, 96, { align: "right" });

  y = Math.max(y, 96) + 24;
  doc.setDrawColor(228, 224, 214);
  doc.line(marginX, y, rightX, y);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 61, 62);
  doc.text("Deliver to", marginX, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(26, 26, 26);
  doc.text(customer?.name ?? "Not specified", marginX, y);
  y += 14;
  if (customer?.phone) {
    doc.text(customer.phone, marginX, y);
    y += 14;
  }
  if (customer?.address) {
    doc.text(customer.address, marginX, y);
    y += 14;
  }

  y += 10;

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
    styles: { fontSize: 9.5, cellPadding: 8, textColor: [26, 26, 26] },
    headStyles: { fillColor: [15, 61, 62], textColor: [247, 245, 240] },
    alternateRowStyles: { fillColor: [247, 245, 240] },
    margin: { left: marginX, right: 40 },
  });

  // @ts-expect-error - lastAutoTable is added by the plugin at runtime
  let afterTableY = doc.lastAutoTable.finalY + 30;

  if (challan.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(86, 82, 72);
    doc.text("Notes", marginX, afterTableY);
    afterTableY += 14;
    doc.text(doc.splitTextToSize(challan.notes, 500), marginX, afterTableY);
    afterTableY += 30;
  }

  afterTableY += 30;
  doc.setDrawColor(228, 224, 214);
  doc.line(marginX, afterTableY, marginX + 180, afterTableY);
  doc.line(rightX - 180, afterTableY, rightX, afterTableY);
  afterTableY += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(86, 82, 72);
  doc.text("Dispatched by", marginX, afterTableY);
  doc.text("Received by", rightX - 180, afterTableY);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(150, 145, 135);
  doc.text("Generated with Zen Biz", marginX, 800);

  doc.save(`Challan-${challan.challan_number}.pdf`);
}
