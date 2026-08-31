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
};

const PROFESSIONAL_FEATURES: PlanFeatures = {
  quotations: true,
  convertQuotationToInvoice: true,
  purchases: true,
  deliveryChallans: true,
  profitAndLoss: false,
  gstBilling: false,
  gstReport: false,
  colourfulStyles: false,
  invoiceWatermark: false,
  shareViaWhatsapp: true,
  expenseTracking: true,
  invoiceTrackingStatuses: true,
  multipleUsers: false,
  stockLowAlerts: false,
  customerOutstandingReport: false,
};

const BUSINESS_FEATURES: PlanFeatures = {
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
};

export function getPlanFeatures(plan: Plan): PlanFeatures {
  switch (plan) {
    case "professional":
      return PROFESSIONAL_FEATURES;
    case "business":
      return BUSINESS_FEATURES;
    default:
      return STARTER_FEATURES;
  }
}

export const PLAN_LABELS: Record<Plan, string> = {
  starter: "Starter",
  professional: "Professional",
  business: "Business",
};

/** Monthly and yearly prices in INR (whole rupees). */
export const PLAN_PRICING: Record<
  "professional" | "business",
  { monthly: number; yearly: number }
> = {
  professional: { monthly: 799, yearly: 7999 },
  business: { monthly: 1999, yearly: 19999 },
};
