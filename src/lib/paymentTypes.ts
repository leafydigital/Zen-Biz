/** One row of the owner console's Payment history. */
export type PaymentRow = {
  id: string;
  createdAt: string;
  customer: string;
  email: string;
  plan: string;
  cycle: string;
  currency: string;
  listPrice: number | null;
  discountCode: string | null;
  discountAmount: number;
  amount: number;
  status: "paid" | "failed" | "pending" | "abandoned";
  failureReason: string | null;
  orderId: string;
  paymentId: string | null;
};

/** A checkout still waiting for payment after this long is shown as abandoned. */
export const PENDING_MINUTES = 30;
