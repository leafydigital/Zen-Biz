import { generateBillingRecordDocumentPdf } from "@/lib/generateBillingRecordPdf";
import { DEFAULT_DOCUMENT_DESIGN } from "@/types/database";
import type { DocDesignSettings, Invoice, InvoiceItem, Customer, Profile } from "@/types/database";

/**
 * Builds a Billing Record PDF and triggers a browser download. This is a
 * separate generator from generateInvoicePdf.ts on purpose — Billing
 * Records and Invoices share the same underlying data shape, but this
 * file exists so Billing Record layout fixes never risk changing how
 * official Invoice PDFs look.
 */
export async function generateBillingRecordPdf({
  invoice,
  items,
  customer,
  profile,
  designOverride,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  customer: Customer | null;
  profile: Profile;
  designOverride?: DocDesignSettings;
}) {
  await generateBillingRecordDocumentPdf({
    docLabel: "BILL",
    docNumber: invoice.invoice_number,
    docDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    status: invoice.status,
    paymentMethod: invoice.payment_method,
    taxType: invoice.tax_type,
    placeOfSupply: invoice.place_of_supply_state,
    partyLabel: "Bill to",
    party: customer
      ? { name: customer.name, phone: customer.phone, address: customer.address, gstin: customer.gstin }
      : { name: "Walk-in customer" },
    shipTo: invoice.ship_to_name || invoice.ship_to_address
      ? { name: invoice.ship_to_name, address: invoice.ship_to_address }
      : null,
    items,
    subtotal: Number(invoice.subtotal),
    gstEnabled: invoice.gst_enabled,
    gstPercent: Number(invoice.gst_percent),
    gstAmount: Number(invoice.gst_amount),
    cgstAmount: Number(invoice.cgst_amount ?? 0),
    sgstAmount: Number(invoice.sgst_amount ?? 0),
    igstAmount: Number(invoice.igst_amount ?? 0),
    roundOff: Number(invoice.round_off ?? 0),
    total: Number(invoice.total),
    notes: invoice.notes,
    profile,
    filenamePrefix: "Billing-Record",
    design: designOverride ?? profile.document_design ?? DEFAULT_DOCUMENT_DESIGN,
    terms: profile.invoice_terms,
    signatureUrl: profile.signature_url,
    currency: invoice.currency,
    bankDetails: {
      bankName: profile.bank_name,
      accountName: profile.bank_account_name,
      accountNumber: profile.bank_account_number,
      ifscOrSwift: profile.bank_ifsc_or_swift,
    },
    qrUrl: profile.payment_qr_url,
  });
}
