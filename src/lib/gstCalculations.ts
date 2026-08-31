import type { TaxType } from "@/types/database";

export interface GstLineInput {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}

export interface GstLineResult {
  /** Quantity × unit price, before discount or tax. */
  grossAmount: number;
  /** Discount amount subtracted from grossAmount. */
  discountAmount: number;
  /** grossAmount − discountAmount — what tax is calculated on. */
  taxableAmount: number;
  /** Tax charged on this line, given the invoice's tax type. */
  taxAmount: number;
  /** taxableAmount + taxAmount (or just taxableAmount for inclusive/exempt). */
  lineTotal: number;
}

/**
 * Computes a single line item's amounts, taking discount and tax type
 * into account. "Inclusive" means the entered rate already contains GST,
 * so tax is backed out rather than added on top; "Exclusive" adds GST on
 * top of the discounted amount; "Exempt" and "Non-GST Supply" both charge
 * zero tax (the distinction between them is for filing/labeling purposes,
 * not arithmetic).
 */
export function calculateGstLine(input: GstLineInput, taxType: TaxType): GstLineResult {
  const grossAmount = input.quantity * input.unitPrice;
  const discountAmount = grossAmount * (input.discountPercent / 100);
  const taxableAmount = grossAmount - discountAmount;

  if (taxType === "exempt" || taxType === "non_gst") {
    return { grossAmount, discountAmount, taxableAmount, taxAmount: 0, lineTotal: taxableAmount };
  }

  if (taxType === "inclusive") {
    const taxAmount = taxableAmount - taxableAmount / (1 + input.taxPercent / 100);
    return { grossAmount, discountAmount, taxableAmount, taxAmount, lineTotal: taxableAmount };
  }

  const taxAmount = taxableAmount * (input.taxPercent / 100);
  return {
    grossAmount,
    discountAmount,
    taxableAmount,
    taxAmount,
    lineTotal: taxableAmount + taxAmount,
  };
}

/**
 * Decides whether a sale is intra-state (CGST+SGST, split evenly) or
 * inter-state (IGST, full amount) by comparing the business's own state
 * to the customer's/supplier's state. If either state is missing, this
 * can't be determined — callers should treat that as "unknown" and avoid
 * silently guessing one way or the other.
 */
export function isSameState(businessState: string | null, partyState: string | null): boolean | null {
  if (!businessState || !partyState) return null;
  return businessState.trim().toLowerCase() === partyState.trim().toLowerCase();
}

export interface GstSplit {
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

/**
 * Splits a total tax amount into CGST+SGST (same state) or IGST
 * (different state). When the state comparison is unknown (missing data
 * on either side), defaults to IGST as the safer assumption — an
 * incorrectly-split intra-state invoice is more likely to raise
 * questions during filing than one that's simply labelled inter-state.
 */
export function splitGstAmount(totalTax: number, sameState: boolean | null): GstSplit {
  if (sameState === true) {
    const half = totalTax / 2;
    return { cgstAmount: half, sgstAmount: half, igstAmount: 0 };
  }
  return { cgstAmount: 0, sgstAmount: 0, igstAmount: totalTax };
}

/**
 * Rounds a grand total to the nearest whole rupee and returns both the
 * rounded value and the adjustment applied, so the "Round Off" line on an
 * invoice can show exactly what was added or subtracted.
 */
export function calculateRoundOff(amount: number): { rounded: number; roundOff: number } {
  const rounded = Math.round(amount);
  return { rounded, roundOff: rounded - amount };
}

export const TAX_TYPE_OPTIONS: { value: TaxType; label: string; hint: string }[] = [
  { value: "exclusive", label: "GST Exclusive", hint: "GST added on top of the rate" },
  { value: "inclusive", label: "GST Inclusive", hint: "Rate already includes GST" },
  { value: "exempt", label: "GST Exempt", hint: "No GST charged, exempt supply" },
  { value: "non_gst", label: "Non-GST Supply", hint: "Outside GST altogether" },
];
