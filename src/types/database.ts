export type Plan = "starter" | "professional" | "business";
export type BillingCycle = "monthly" | "yearly";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected";
export type PurchaseStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type DeliveryChallanStatus = "draft" | "dispatched" | "delivered";
export type PaymentMethod = "cash" | "upi" | "bank" | "credit_card" | "cheque" | "other";
export type TaxType = "inclusive" | "exclusive" | "exempt" | "non_gst";

export type DocPaperSize = "a4" | "a5" | "thermal";
export type DocStyle = "default" | "thermal_simple" | "colourful_paid";
export type DocFontSize = 9 | 10 | 11 | 12 | 13 | 14;

export interface DocDesignSettings {
  paperSize: DocPaperSize;
  style: DocStyle;
  fontSize: DocFontSize;
}

export const DEFAULT_DOCUMENT_DESIGN: DocDesignSettings = {
  paperSize: "a4",
  style: "default",
  fontSize: 10,
};

/** Common currencies shown in the per-document currency picker. */
export const CURRENCY_OPTIONS = [
  { code: "INR", label: "₹ INR — Indian Rupee" },
  { code: "USD", label: "$ USD — US Dollar" },
  { code: "EUR", label: "€ EUR — Euro" },
  { code: "GBP", label: "£ GBP — British Pound" },
  { code: "AED", label: "AED — UAE Dirham" },
  { code: "SGD", label: "SGD — Singapore Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  SGD: "SGD ",
  AUD: "AUD ",
  CAD: "CAD ",
};

export interface Profile {
  id: string;
  business_name: string;
  business_type: string;
  logo_url: string | null;
  address: string | null;
  state: string | null;
  gst_number: string | null;
  phone: string | null;
  plan: Plan;
  billing_cycle: BillingCycle | null;
  plan_renews_at: string | null;
  onboarding_complete: boolean;
  // Shared across Invoice, Quotation, and Purchase — one paper size/style/
  // font/signature setting rather than three separate ones.
  document_design: DocDesignSettings;
  signature_url: string | null;
  // Terms & Conditions stay separate per document type.
  invoice_terms: string | null;
  quotation_terms: string | null;
  purchase_terms: string | null;
  // Bank details and payment QR — shared business-wide, both optional.
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_or_swift: string | null;
  payment_qr_url: string | null;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string;
  stock_qty: number | null;
  category: string | null;
  item_code: string | null;
  hsn_code: string | null;
  tax_percent: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  state: string | null;
  gstin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  owner_id: string;
  customer_id: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  payment_method: PaymentMethod | null;
  amount_paid: number;
  currency: string;
  ship_to_name: string | null;
  ship_to_address: string | null;
  delivery_address: string | null;
  vehicle_number: string | null;
  transport_name: string | null;
  tax_type: TaxType;
  place_of_supply_state: string | null;
  subtotal: number;
  gst_enabled: boolean;
  gst_percent: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  owner_id: string;
  invoice_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  item_code: string | null;
  hsn_code: string | null;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
}

export interface Quotation {
  id: string;
  owner_id: string;
  customer_id: string | null;
  quotation_number: string;
  quotation_date: string;
  valid_until: string | null;
  status: QuotationStatus;
  currency: string;
  ship_to_name: string | null;
  ship_to_address: string | null;
  delivery_address: string | null;
  vehicle_number: string | null;
  transport_name: string | null;
  tax_type: TaxType;
  place_of_supply_state: string | null;
  subtotal: number;
  gst_enabled: boolean;
  gst_percent: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  owner_id: string;
  quotation_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  item_code: string | null;
  hsn_code: string | null;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
}

export interface Supplier {
  id: string;
  owner_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  state: string | null;
  gstin: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  owner_id: string;
  supplier_id: string | null;
  purchase_number: string;
  purchase_date: string;
  status: PurchaseStatus;
  payment_method: PaymentMethod | null;
  amount_paid: number;
  currency: string;
  delivery_address: string | null;
  vehicle_number: string | null;
  transport_name: string | null;
  tax_type: TaxType;
  place_of_supply_state: string | null;
  subtotal: number;
  gst_enabled: boolean;
  gst_percent: number;
  gst_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  round_off: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  owner_id: string;
  purchase_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  item_code: string | null;
  hsn_code: string | null;
  unit_price: number;
  discount_percent: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  created_at: string;
}

export interface DeliveryChallan {
  id: string;
  owner_id: string;
  customer_id: string | null;
  challan_number: string;
  challan_date: string;
  status: DeliveryChallanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryChallanItem {
  id: string;
  owner_id: string;
  challan_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  item_code: string | null;
  created_at: string;
}

export type PaymentStatus = "created" | "paid" | "failed";
export type PayablePlan = "professional" | "business";

export interface SubscriptionPayment {
  id: string;
  owner_id: string;
  plan: PayablePlan;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

// Minimal Supabase Database generic — hand-maintained to match schema.sql.
// If you later generate types via `supabase gen types typescript`, this file
// can be replaced wholesale without touching any other file, since all
// imports go through `@/types/database`.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: never[];
      };
      products: {
        Row: Product;
        Insert: Partial<Product> & { name: string; owner_id: string };
        Update: Partial<Product>;
        Relationships: never[];
      };
      customers: {
        Row: Customer;
        Insert: Partial<Customer> & { name: string; owner_id: string };
        Update: Partial<Customer>;
        Relationships: never[];
      };
      invoices: {
        Row: Invoice;
        Insert: Partial<Invoice> & { invoice_number: string; owner_id: string };
        Update: Partial<Invoice>;
        Relationships: never[];
      };
      invoice_items: {
        Row: InvoiceItem;
        Insert: Partial<InvoiceItem> & { invoice_id: string; owner_id: string; description: string };
        Update: Partial<InvoiceItem>;
        Relationships: never[];
      };
      quotations: {
        Row: Quotation;
        Insert: Partial<Quotation> & { quotation_number: string; owner_id: string };
        Update: Partial<Quotation>;
        Relationships: never[];
      };
      quotation_items: {
        Row: QuotationItem;
        Insert: Partial<QuotationItem> & { quotation_id: string; owner_id: string; description: string };
        Update: Partial<QuotationItem>;
        Relationships: never[];
      };
      suppliers: {
        Row: Supplier;
        Insert: Partial<Supplier> & { name: string; owner_id: string };
        Update: Partial<Supplier>;
        Relationships: never[];
      };
      purchases: {
        Row: Purchase;
        Insert: Partial<Purchase> & { purchase_number: string; owner_id: string };
        Update: Partial<Purchase>;
        Relationships: never[];
      };
      purchase_items: {
        Row: PurchaseItem;
        Insert: Partial<PurchaseItem> & { purchase_id: string; owner_id: string; description: string };
        Update: Partial<PurchaseItem>;
        Relationships: never[];
      };
      delivery_challans: {
        Row: DeliveryChallan;
        Insert: Partial<DeliveryChallan> & { challan_number: string; owner_id: string };
        Update: Partial<DeliveryChallan>;
        Relationships: never[];
      };
      delivery_challan_items: {
        Row: DeliveryChallanItem;
        Insert: Partial<DeliveryChallanItem> & { challan_id: string; owner_id: string; description: string };
        Update: Partial<DeliveryChallanItem>;
        Relationships: never[];
      };
      subscription_payments: {
        Row: SubscriptionPayment;
        Insert: Partial<SubscriptionPayment> & {
          owner_id: string;
          plan: PayablePlan;
          billing_cycle: BillingCycle;
          amount: number;
          razorpay_order_id: string;
        };
        Update: Partial<SubscriptionPayment>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
