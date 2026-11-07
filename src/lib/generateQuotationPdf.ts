import { generateSaleDocumentPdf } from "@/lib/generateSaleDocumentPdf";
import { DEFAULT_DOCUMENT_DESIGN } from "@/types/database";
import type { DocDesignSettings, Quotation, QuotationItem, Customer, Profile } from "@/types/database";

/**
 * Builds a quotation PDF and triggers a browser download. Quotations never
 * carry a "paid/unpaid" status stamp the way invoices do — they're priced
 * offers, not settled transactions — so no status line is shown. Paper
 * size/style/font/signature come from the shared document_design setting;
 * quotation_terms stays specific to quotations.
 */
export async function generateQuotationPdf({
  quotation,
  items,
  customer,
  profile,
  designOverride,
  preview,
}: {
  quotation: Quotation;
  items: QuotationItem[];
  customer: Customer | null;
  profile: Profile;
  designOverride?: DocDesignSettings;
  /** Returns the PDF as a Blob instead of downloading it. */
  preview?: boolean;
}) {
  const proforma = quotation.doc_kind === "proforma";
  return await generateSaleDocumentPdf({
    preview,
    docLabel: proforma ? "PROFORMA INVOICE" : "QUOTATION",
    titleText: proforma ? undefined : profile.format_settings?.titles?.quotation,
    docNumber: quotation.quotation_number,
    docDate: quotation.quotation_date,
    dueDate: quotation.valid_until,
    status: quotation.status,
    taxType: quotation.tax_type,
    placeOfSupply: quotation.place_of_supply_state,
    partyLabel: proforma ? "Bill to" : "Quote for",
    party: customer
      ? { name: customer.name, phone: customer.phone, address: customer.address, gstin: customer.gstin }
      : { name: "Not specified" },
    shipTo: quotation.ship_to_name || quotation.ship_to_address
      ? { name: quotation.ship_to_name, address: quotation.ship_to_address }
      : null,
    items,
    subtotal: Number(quotation.subtotal),
    gstEnabled: quotation.gst_enabled,
    gstPercent: Number(quotation.gst_percent),
    gstAmount: Number(quotation.gst_amount),
    cgstAmount: Number(quotation.cgst_amount ?? 0),
    sgstAmount: Number(quotation.sgst_amount ?? 0),
    igstAmount: Number(quotation.igst_amount ?? 0),
    roundOff: Number(quotation.round_off ?? 0),
    total: Number(quotation.total),
    notes: quotation.notes,
    profile,
    filenamePrefix: proforma ? "Proforma-Invoice" : "Quotation",
    design: designOverride ?? profile.document_design ?? DEFAULT_DOCUMENT_DESIGN,
    terms: profile.quotation_terms,
    signatureUrl: profile.signature_url,
    currency: quotation.currency,
    bankDetails: {
      bankName: profile.bank_name,
      accountName: profile.bank_account_name,
      accountNumber: profile.bank_account_number,
      ifscOrSwift: profile.bank_ifsc_or_swift,
    },
    qrUrl: profile.payment_qr_url,
  });
}
