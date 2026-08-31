import type { PaymentMethod } from "@/types/database";

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
] as const;
