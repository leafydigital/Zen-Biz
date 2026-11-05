import { INDIAN_STATES } from "@/lib/indianStates";
import { uqc } from "@/lib/ewayBillJson";
import type { Business, Customer, Invoice, InvoiceItem } from "@/types/database";

/**
 * Builds the JSON file the GST e-invoice portal (IRP) accepts for bulk
 * generation, so an IRN can be made free of charge: download this file here,
 * upload it on the portal while signed in to your own GST account.
 */
export interface EinvoiceExtra {
  fromPlace: string;
  fromPincode: string;
  toPlace: string;
  toPincode: string;
}

const stateCode = (name: string | null | undefined) => {
  const n = (name ?? "").trim().toLowerCase();
  const hit = INDIAN_STATES.find((s) => s.name.toLowerCase() === n) ?? INDIAN_STATES.find((s) => n && s.name.toLowerCase().startsWith(n));
  return hit ? hit.gstCode : null;
};
const ddmmyyyy = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildEinvoiceJson(
  invoice: Invoice,
  items: InvoiceItem[],
  customer: Customer | null,
  business: Business,
  extra: EinvoiceExtra
): { json: string | null; problems: string[] } {
  const problems: string[] = [];
  const sellerGstin = (business.gst_number ?? "").trim().toUpperCase();
  const buyerGstin = (customer?.gstin ?? "").trim().toUpperCase();
  if (!/^\d{2}[A-Z0-9]{13}$/.test(sellerGstin)) problems.push("Your GST number is missing or not valid. Add it in Settings → General.");
  if (!/^\d{2}[A-Z0-9]{13}$/.test(buyerGstin)) problems.push("E-invoice is only for sales to GST-registered businesses. Add the customer's GSTIN to the customer.");
  if (!/^\d{6}$/.test(extra.fromPincode)) problems.push("Enter your 6-digit pincode.");
  if (!/^\d{6}$/.test(extra.toPincode)) problems.push("Enter the customer's 6-digit pincode.");
  if (!extra.fromPlace.trim()) problems.push("Enter your city.");
  if (!extra.toPlace.trim()) problems.push("Enter the customer's city.");
  if (items.length === 0) problems.push("This invoice has no items.");

  const fromState = stateCode(business.state) ?? (sellerGstin ? sellerGstin.slice(0, 2) : null);
  const toState = /^\d{2}/.test(buyerGstin) ? buyerGstin.slice(0, 2) : stateCode(customer?.state);
  const pos = stateCode(invoice.place_of_supply_state) ?? toState;
  if (!fromState) problems.push("Choose your state in Settings → General.");
  const noHsn = items.filter((i) => !/^\d{4,8}$/.test((i.hsn_code ?? "").trim())).map((i) => i.description);
  if (noHsn.length) problems.push(`Add a 4–8 digit HSN code to: ${noHsn.join(", ")}.`);
  if (problems.length) return { json: null, problems };

  const intra = Number(invoice.igst_amount ?? 0) > 0 ? false : Number(invoice.cgst_amount ?? 0) > 0 ? true : fromState === pos;
  let ass = 0, cgst = 0, sgst = 0, igst = 0, disc = 0;
  const list = items.map((i, idx) => {
    const rate = Number(i.tax_percent ?? 0);
    const qty = Number(i.quantity);
    const a = r2(Number(i.line_total));
    const gross = Math.max(r2(qty * Number(i.unit_price)), a);
    const d = r2(gross - a);
    const c = intra ? r2((a * rate) / 200) : 0;
    const g = intra ? 0 : r2((a * rate) / 100);
    ass += a; cgst += c; sgst += c; igst += g; disc += d;
    return {
      SlNo: String(idx + 1),
      PrdDesc: i.description.slice(0, 300),
      IsServc: "N",
      HsnCd: i.hsn_code!.trim(),
      Qty: qty,
      Unit: uqc(i.unit || ""),
      UnitPrice: qty ? r2(gross / qty) : 0,
      TotAmt: gross,
      Discount: d,
      AssAmt: a,
      GstRt: rate,
      IgstAmt: g,
      CgstAmt: c,
      SgstAmt: c,
      CesRt: 0,
      CesAmt: 0,
      TotItemVal: r2(a + c + c + g),
    };
  });
  const total = r2(Number(invoice.total));
  const doc = {
    Version: "1.1",
    TranDtls: { TaxSch: "GST", SupTyp: "B2B", RegRev: "N", IgstOnIntra: "N" },
    DocDtls: { Typ: "INV", No: invoice.invoice_number.replace(/[^A-Za-z0-9/-]/g, "").slice(0, 16), Dt: ddmmyyyy(invoice.invoice_date) },
    SellerDtls: {
      Gstin: sellerGstin,
      LglNm: business.business_name.slice(0, 100),
      Addr1: (business.address ?? business.business_name).slice(0, 100),
      Loc: extra.fromPlace.trim().slice(0, 50),
      Pin: Number(extra.fromPincode),
      Stcd: fromState,
    },
    BuyerDtls: {
      Gstin: buyerGstin,
      LglNm: (customer?.name ?? "").slice(0, 100),
      Pos: pos,
      Addr1: (invoice.delivery_address || customer?.address || customer?.name || "").slice(0, 100),
      Loc: extra.toPlace.trim().slice(0, 50),
      Pin: Number(extra.toPincode),
      Stcd: toState,
    },
    ItemList: list,
    ValDtls: {
      AssVal: r2(ass),
      CgstVal: r2(cgst),
      SgstVal: r2(sgst),
      IgstVal: r2(igst),
      CesVal: 0,
      Discount: 0,
      RndOffAmt: r2(total - (ass + cgst + sgst + igst)),
      TotInvVal: total,
    },
  };
  return { json: JSON.stringify([doc], null, 2), problems: [] };
}
