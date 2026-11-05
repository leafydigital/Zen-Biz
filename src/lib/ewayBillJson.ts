import { INDIAN_STATES } from "@/lib/indianStates";
import type { Business, Customer, Invoice, InvoiceItem } from "@/types/database";

/**
 * Builds the JSON file the GST e-way bill portal accepts under
 * "Generate Bulk" (ewaybillgst.gov.in), so an e-way bill can be made free of
 * charge: download this file here, upload it on the portal while signed in
 * to your own GST account. Zen Biz never sees your GST portal password.
 */
export interface EwayExtra {
  fromPincode: string;
  fromPlace: string;
  toPincode: string;
  toPlace: string;
  distanceKm: string;
  vehicleNo: string;
  transporterId: string;
  transporterName: string;
}

const stateCode = (name: string | null | undefined) => {
  const n = (name ?? "").trim().toLowerCase();
  const hit = INDIAN_STATES.find((s) => s.name.toLowerCase() === n) ?? INDIAN_STATES.find((s) => n && s.name.toLowerCase().startsWith(n));
  return hit ? Number(hit.gstCode) : null;
};

/** Portal unit codes (UQC) for the usual unit words. */
function uqc(unit: string): string {
  const u = unit.trim().toLowerCase();
  const map: Record<string, string> = {
    kg: "KGS", kgs: "KGS", g: "GMS", gm: "GMS", gram: "GMS", grams: "GMS", l: "LTR", ltr: "LTR", litre: "LTR", liter: "LTR", ml: "MLT",
    m: "MTR", mtr: "MTR", meter: "MTR", metre: "MTR", pcs: "PCS", pc: "PCS", piece: "PCS", pieces: "PCS", nos: "NOS", no: "NOS", item: "NOS",
    box: "BOX", boxes: "BOX", pack: "PAC", packs: "PAC", dozen: "DOZ", doz: "DOZ", set: "SET", pair: "PRS", bag: "BAG", bags: "BAG",
    bottle: "BTL", roll: "ROL", sqft: "SQF", sqm: "SQM", ton: "TON", tonne: "TON", unit: "UNT", units: "UNT",
  };
  return map[u] ?? "OTH";
}

const ddmmyyyy = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Fills what we can from the invoice; returns the file and a list of things still missing. */
export function buildEwayBillJson(
  invoice: Invoice,
  items: InvoiceItem[],
  customer: Customer | null,
  business: Business,
  extra: EwayExtra
): { json: string | null; problems: string[] } {
  const problems: string[] = [];
  const fromGstin = (business.gst_number ?? "").trim().toUpperCase();
  if (!/^\d{2}[A-Z0-9]{13}$/.test(fromGstin)) problems.push("Your GST number is missing or not valid. Add it in Settings → General.");
  if (!/^\d{6}$/.test(extra.fromPincode)) problems.push("Enter the 6-digit pincode you are sending from.");
  if (!/^\d{6}$/.test(extra.toPincode)) problems.push("Enter the 6-digit pincode you are sending to.");
  if (!extra.fromPlace.trim()) problems.push("Enter the place (city) you are sending from.");
  if (!extra.toPlace.trim()) problems.push("Enter the place (city) you are sending to.");
  if (items.length === 0) problems.push("This invoice has no items.");

  const fromState = stateCode(business.state) ?? (fromGstin ? Number(fromGstin.slice(0, 2)) : null);
  const toGstin = (customer?.gstin ?? "").trim().toUpperCase();
  const toState = stateCode(invoice.place_of_supply_state ?? customer?.state) ?? (/^\d{2}/.test(toGstin) ? Number(toGstin.slice(0, 2)) : null);
  if (!fromState) problems.push("Choose your state in Settings → General.");
  if (!toState) problems.push("The customer's state is missing. Add it to the customer.");

  const noHsn = items.filter((i) => !/^\d{4,8}$/.test((i.hsn_code ?? "").trim())).map((i) => i.description);
  if (noHsn.length) problems.push(`Add a 4–8 digit HSN code to: ${noHsn.join(", ")}.`);
  if (problems.length) return { json: null, problems };

  const intra = Number(invoice.igst_amount ?? 0) > 0 ? false : Number(invoice.cgst_amount ?? 0) > 0 ? true : fromState === toState;
  const lines = items.map((i) => {
    const rate = Number(i.tax_percent ?? 0);
    return {
      productName: i.description.slice(0, 100),
      productDesc: i.description.slice(0, 100),
      hsnCode: Number(i.hsn_code!.trim()),
      quantity: Number(i.quantity),
      qtyUnit: uqc(i.unit || ""),
      taxableAmount: r2(Number(i.line_total)),
      sgstRate: intra ? rate / 2 : 0,
      cgstRate: intra ? rate / 2 : 0,
      igstRate: intra ? 0 : rate,
      cessRate: 0,
    };
  });
  const totalValue = r2(lines.reduce((a, l) => a + l.taxableAmount, 0));
  const tax = (rate: number, base: number) => r2((base * rate) / 100);
  const cgst = r2(lines.reduce((a, l) => a + tax(l.cgstRate, l.taxableAmount), 0));
  const sgst = r2(lines.reduce((a, l) => a + tax(l.sgstRate, l.taxableAmount), 0));
  const igst = r2(lines.reduce((a, l) => a + tax(l.igstRate, l.taxableAmount), 0));

  const bill = {
    userGstin: fromGstin,
    supplyType: "O",
    subSupplyType: 1,
    subSupplyDesc: "",
    docType: "INV",
    docNo: invoice.invoice_number.replace(/[^A-Za-z0-9/-]/g, "").slice(0, 16),
    docDate: ddmmyyyy(invoice.invoice_date),
    fromGstin,
    fromTrdName: business.business_name.slice(0, 100),
    fromAddr1: (business.address ?? business.business_name).slice(0, 120),
    fromAddr2: "",
    fromPlace: extra.fromPlace.trim().slice(0, 50),
    fromPincode: Number(extra.fromPincode),
    actFromStateCode: fromState,
    fromStateCode: fromState,
    toGstin: toGstin || "URP",
    toTrdName: (customer?.name ?? "Walk-in customer").slice(0, 100),
    toAddr1: (invoice.delivery_address || customer?.address || "").slice(0, 120),
    toAddr2: "",
    toPlace: extra.toPlace.trim().slice(0, 50),
    toPincode: Number(extra.toPincode),
    actToStateCode: toState,
    toStateCode: toState,
    transactionType: 1,
    otherValue: 0,
    totalValue,
    cgstValue: cgst,
    sgstValue: sgst,
    igstValue: igst,
    cessValue: 0,
    cessNonAdvolValue: 0,
    totInvValue: r2(Number(invoice.total)),
    transporterId: extra.transporterId.trim().toUpperCase(),
    transporterName: extra.transporterName.trim().slice(0, 100),
    transDocNo: "",
    transMode: "1",
    transDistance: String(Math.round(Number(extra.distanceKm) || 0)),
    transDocDate: "",
    vehicleNo: extra.vehicleNo.replace(/[^A-Za-z0-9]/g, "").toUpperCase(),
    vehicleType: "R",
    mainHsnCode: lines[0].hsnCode,
    itemList: lines,
  };
  return { json: JSON.stringify({ version: "1.0.0621", billLists: [bill] }, null, 2), problems: [] };
}
