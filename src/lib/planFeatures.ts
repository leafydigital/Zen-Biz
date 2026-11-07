import type { Plan } from "@/types/database";

/**
 * Single source of truth for what each plan tier can access. Every feature
 * gate in the app should check through here rather than comparing
 * `profile.plan` directly — that way the tier boundaries only ever need to
 * change in one place. This maps the Phase 1 tier spec (Starter →
 * Professional → Business).
 */
export interface PlanFeatures {
  quotations: boolean;
  convertQuotationToInvoice: boolean;
  purchases: boolean;
  deliveryChallans: boolean;
  profitAndLoss: boolean;
  gstBilling: boolean;
  gstReport: boolean;
  colourfulStyles: boolean;
  invoiceWatermark: boolean;
  shareViaWhatsapp: boolean;
  expenseTracking: boolean;
  invoiceTrackingStatuses: boolean;
  multipleUsers: boolean;
  stockLowAlerts: boolean;
  customerOutstandingReport: boolean;
  /** POS-style compact receipt printing (thermal 80mm/58mm layouts) —
   * Professional and Business only. */
  posPrintSupport: boolean;
  /** Barcode scanning for quickly adding items to an invoice/sale —
   * Business only. Flag only for now; the scanning feature itself isn't
   * built yet. */
  barcodeScanning: boolean;
  /** E-way bill details (number, validity, distance, transporter) on invoices — Professional and Business. */
  ewayBill: boolean;
  /**
   * Usage ceilings for this plan. `null` means unlimited. These are the
   * actual enforced limits — checked at creation time for customers,
   * products, and invoices (invoices reset monthly), not just displayed
   * as marketing copy.
   */
  limits: {
    invoicesPerMonth: number | null;
    customers: number | null;
    products: number | null;
    businesses: number | null;
    users: number | null;
  };
}

const STARTER_FEATURES: PlanFeatures = {
  quotations: true,
  convertQuotationToInvoice: true,
  purchases: false,
  deliveryChallans: false,
  profitAndLoss: false,
  gstBilling: false,
  gstReport: false,
  colourfulStyles: false,
  invoiceWatermark: true,
  shareViaWhatsapp: false,
  expenseTracking: false,
  invoiceTrackingStatuses: false,
  multipleUsers: false,
  stockLowAlerts: false,
  customerOutstandingReport: false,
  posPrintSupport: true,
  barcodeScanning: false,
  ewayBill: false,
  limits: {
    invoicesPerMonth: 50,
    customers: 75,
    products: 75,
    businesses: 1,
    users: 1,
  },
};

/** The single paid tier ("Pro"): everything, 5 businesses, 10 users. The old
 * Professional and Business plans were merged into this. */
const PRO_FEATURES: PlanFeatures = {
  quotations: true,
  convertQuotationToInvoice: true,
  purchases: true,
  deliveryChallans: true,
  profitAndLoss: true,
  gstBilling: true,
  gstReport: true,
  colourfulStyles: true,
  invoiceWatermark: false,
  shareViaWhatsapp: true,
  expenseTracking: true,
  invoiceTrackingStatuses: true,
  multipleUsers: true,
  stockLowAlerts: true,
  customerOutstandingReport: true,
  posPrintSupport: true,
  barcodeScanning: true,
  ewayBill: true,
  limits: {
    invoicesPerMonth: null,
    customers: null,
    products: null,
    businesses: 5,
    users: 10,
  },
};

export function getPlanFeatures(plan: Plan): PlanFeatures {
  switch (plan) {
    // "business" is a legacy value from before the merge: it is the same as Pro.
    case "professional":
    case "business":
      return PRO_FEATURES;
    default:
      return STARTER_FEATURES;
  }
}

export const PLAN_LABELS: Record<Plan, string> = {
  starter: "Basic",
  professional: "Pro",
  business: "Pro",
};

/** Monthly and yearly prices in INR (whole rupees). */
export const PLAN_PRICING: Record<
  "professional" | "business",
  { monthly: number; yearly: number }
> = {
  professional: { monthly: 799, yearly: 7999 },
  business: { monthly: 1999, yearly: 19999 },
};

export type LimitKind = "customers" | "products" | "invoicesPerMonth";

/**
 * The exact copy shown when a Starter-plan limit is hit. Centralized here
 * so the message is identical wherever the limit is enforced (creation
 * forms, dashboard, anywhere else) rather than being retyped per call site.
 */
export function getLimitMessage(kind: LimitKind, limit: number) {
  switch (kind) {
    case "customers":
      return {
        title: `You've reached the ${limit} customer limit on your Starter plan.`,
        body: "Upgrade to Professional for unlimited customers and more powerful business management tools.",
      };
    case "products":
      return {
        title: `You've reached the ${limit} product limit on your Starter plan.`,
        body: "Upgrade to Professional for unlimited products and more powerful business management tools.",
      };
    case "invoicesPerMonth":
      return {
        title: `You've reached your ${limit} invoice limit for this month.`,
        body: "Upgrade to Professional for unlimited invoices.",
      };
  }
}
