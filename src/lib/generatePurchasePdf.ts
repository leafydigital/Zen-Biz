import { generateSaleDocumentPdf } from "@/lib/generateSaleDocumentPdf";
import { DEFAULT_DOCUMENT_DESIGN } from "@/types/database";
import type { Purchase, PurchaseItem, Supplier, Profile } from "@/types/database";

/**
 * Builds a purchase record PDF (useful as a receipt for your own records)
 * and triggers a browser download. Paper size/style/font/signature come
 * from the shared document_design setting; purchase_terms stays specific
 * to purchases.
 */
export async function generatePurchasePdf({
  purchase,
  items,
  supplier,
  profile,
}: {
  purchase: Purchase;
  items: PurchaseItem[];
  supplier: Supplier | null;
  profile: Profile;
}) {
  await generateSaleDocumentPdf({
    docLabel: "PURCHASE",
    docNumber: purchase.purchase_number,
    docDate: purchase.purchase_date,
    status: purchase.status,
    partyLabel: "Purchased from",
    party: supplier
      ? { name: supplier.name, phone: supplier.phone, address: supplier.address }
      : { name: "Not specified" },
    items,
    subtotal: Number(purchase.subtotal),
    gstEnabled: purchase.gst_enabled,
    gstPercent: Number(purchase.gst_percent),
    gstAmount: Number(purchase.gst_amount),
    total: Number(purchase.total),
    notes: purchase.notes,
    profile,
    filenamePrefix: "Purchase",
    design: profile.document_design ?? DEFAULT_DOCUMENT_DESIGN,
    terms: profile.purchase_terms,
    signatureUrl: profile.signature_url,
    currency: purchase.currency,
    bankDetails: {
      bankName: profile.bank_name,
      accountName: profile.bank_account_name,
      accountNumber: profile.bank_account_number,
      ifscOrSwift: profile.bank_ifsc_or_swift,
    },
    qrUrl: profile.payment_qr_url,
  });
}
