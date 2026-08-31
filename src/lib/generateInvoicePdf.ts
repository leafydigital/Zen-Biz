import { generateSaleDocumentPdf } from "@/lib/generateSaleDocumentPdf";
import { DEFAULT_DOCUMENT_DESIGN } from "@/types/database";
import type { DocDesignSettings, Invoice, InvoiceItem, Customer, Profile } from "@/types/database";

/**
 * Builds an invoice PDF and triggers a browser download. Paper size, style,
 * font size, and signature/seal come from the owner's shared
 * document_design/signature_url settings (used identically for Invoice,
 * Quotation, and Purchase) unless an override is passed in (used by the
 * live preview in Settings). Invoice Terms & Conditions stay specific to
 * invoices. Currency comes from the invoice itself, since it's chosen per
 * document rather than fixed business-wide.
 */
export async function generateInvoicePdf({
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
  await generateSaleDocumentPdf({
    docLabel: "INVOICE",
    docNumber: invoice.invoice_number,
    docDate: invoice.invoice_date,
    dueDate: invoice.due_date,
    status: invoice.status,
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
    total: Number(invoice.total),
    notes: invoice.notes,
    profile,
    filenamePrefix: "Invoice",
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
