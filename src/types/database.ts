export type Plan = "starter" | "professional" | "business";
export type BillingCycle = "monthly" | "yearly";
export type InvoiceStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected";
export type PurchaseStatus = "unpaid" | "partial" | "paid" | "cancelled";
export type DeliveryChallanStatus = "draft" | "dispatched" | "delivered";
export type PaymentMethod = "cash" | "upi" | "bank" | "credit_card" | "cheque" | "other";
/**
 * "gst" / "tax" / "non_tax" are the three modes selectable in the Tax
 * Type dropdown going forward. "inclusive" / "exclusive" / "exempt" /
 * "non_gst" are kept only so older saved documents (invoices, quotations,
 * purchases) written before this dropdown existed keep loading and
 * printing correctly — the app no longer writes these values.
 */
export type TaxType = "gst" | "tax" | "non_tax" | "inclusive" | "exclusive" | "exempt" | "non_gst";

/** Within "gst" mode, whether the entered rate already includes GST. */
export type GstPricingMode = "inclusive" | "exclusive";

export type DocPaperSize = "a4" | "a5" | "thermal" | "thermal58";
/** "default" / "thermal_simple" / "colourful_paid" are old saved values, still understood. */
export type DocStyle = "simple" | "colourful" | "custom" | "template" | "default" | "thermal_simple" | "colourful_paid";
export type DocFontSize = 9 | 10 | 11 | 12 | 13 | 14;

export type DocFontFamily = "helvetica" | "times" | "courier";

/** Extra switches for the "Custom" style. */
export interface DocCustomOptions {
  fontFamily: DocFontFamily;
  showLogo: boolean;
  showHsn: boolean;
  showBank: boolean;
  showQr: boolean;
  showSignature: boolean;
  showNotes: boolean;
  showTerms: boolean;
  tintTable: boolean;
}

export const DEFAULT_CUSTOM_OPTIONS: DocCustomOptions = {
  fontFamily: "helvetica",
  showLogo: true,
  showHsn: true,
  showBank: true,
  showQr: true,
  showSignature: true,
  showNotes: true,
  showTerms: true,
  tintTable: true,
};

export interface DocDesignSettings {
  paperSize: DocPaperSize;
  style: DocStyle;
  fontSize: DocFontSize;
  /** Hex colour such as "#1d4ed8" — used by Colourful and Custom. */
  accentColor?: string;
  /** Id of a ready-made look (see docTemplates.ts), used when style is "template". */
  template?: string;
  /** Id of a thermal receipt look, used on 58/80 mm paper. */
  thermalTemplate?: string;
  custom?: Partial<DocCustomOptions>;
  /** Separate size adjustments (paid plans). Unset = automatic. */
  sizes?: DocSizes;
}

export interface DocSizes {
  /** Business name in the header, pt. */
  headerName?: number;
  /** Address / phone / GSTIN in the header, pt. */
  headerDetails?: number;
  /** Logo size, percent of normal. */
  logoPercent?: number;
  /** Item table text, pt. */
  tableText?: number;
  /** Grand total amount, pt. */
  totalAmount?: number;
}

export const DEFAULT_DOCUMENT_DESIGN: DocDesignSettings = {
  paperSize: "a4",
  style: "simple",
  fontSize: 10,
  accentColor: "#1d4ed8",
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

/**
 * A business a user owns or belongs to. Holds everything that's genuinely
 * business-specific — a single login can now own or be a member of more
 * than one of these. Profile above is intentionally left untouched (still
 * carries the same fields) so every existing page that reads
 * profile.business_name / profile.gst_number / etc. keeps working exactly
 * as before; new business-aware pages should read from the active
 * Business object instead (see getActiveBusiness()).
 */
export interface Business {
  id: string;
  owner_id: string;
  business_name: string;
  business_type: string;
  logo_url: string | null;
  address: string | null;
  state: string | null;
  gst_number: string | null;
  phone: string | null;
  email?: string | null;
  document_design: DocDesignSettings;
  /** Activity-log entries older than this many days are deleted automatically (null = keep forever). */
  log_retention_days?: number | null;
  format_settings?: import("@/lib/formatSettings").FormatSettings | null;
  barcode_settings?: Partial<import("@/lib/barcode").BarcodeSettings> | null;
  /** Items with this many or fewer in stock are shown as low stock. */
  low_stock_level?: number | null;
  /** Billing (POS) loyalty points rules and UPI id. */
  billing_settings?: Partial<import("@/lib/billingLoyalty").BillingSettings> | null;
  /** Low-stock limit per unit, e.g. { "pcs": 10, "kg": 2 }. Units not listed use low_stock_level. */
  low_stock_limits?: Record<string, number | null> | null;
  product_categories?: string[] | null;
  signature_url: string | null;
  invoice_terms: string | null;
  quotation_terms: string | null;
  purchase_terms: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_or_swift: string | null;
  payment_qr_url: string | null;
  default_currency: string;
  created_at: string;
  updated_at: string;
}

export type BusinessRole = "owner" | "admin" | "manager" | "staff" | "member";

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: BusinessRole;
  created_at: string;
}

export type AnalyticsChartId =
  | "profitLoss"
  | "expenseBreakdown"
  | "salesVsPurchases"
  | "outstandingCollected"
  | "topProducts"
  | "invoiceStatus";

export type AnalyticsDateRange = "thisMonth" | "3months" | "6months" | "thisYear";

export interface AnalyticsPreferences {
  visibleCharts: AnalyticsChartId[];
  chartTypes: Partial<Record<AnalyticsChartId, "line" | "bar" | "pie">>;
  dateRange: AnalyticsDateRange;
}

export const DEFAULT_ANALYTICS_PREFERENCES: AnalyticsPreferences = {
  visibleCharts: [
    "profitLoss",
    "expenseBreakdown",
    "salesVsPurchases",
    "outstandingCollected",
    "topProducts",
    "invoiceStatus",
  ],
  chartTypes: { profitLoss: "line", salesVsPurchases: "bar", outstandingCollected: "bar" },
  dateRange: "thisMonth",
};

export type SupportTicketType = "info" | "issue";
export type SupportTicketStatus = "open" | "in_progress" | "resolved";

export interface SupportTicket {
  id: string;
  user_id: string;
  business_id: string | null;
  ticket_type: SupportTicketType;
  name: string;
  ticket_no?: number | null;
  phone?: string | null;
  whatsapp_number: string | null;
  email: string;
  address: string | null;
  pincode: string | null;
  notes: string | null;
  message: string;
  screenshot_url: string | null;
  status: SupportTicketStatus;
  created_at: string;
}

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
  language: string;
  analytics_preferences: AnalyticsPreferences;
  // Shared across Invoice, Quotation, and Purchase — one paper size/style/
  // font/signature setting rather than three separate ones.
  document_design: DocDesignSettings;
  format_settings?: import("@/lib/formatSettings").FormatSettings | null;
  barcode_settings?: Partial<import("@/lib/barcode").BarcodeSettings> | null;
  /** Items with this many or fewer in stock are shown as low stock. */
  low_stock_level?: number | null;
  /** Billing (POS) loyalty points rules and UPI id. */
  billing_settings?: Partial<import("@/lib/billingLoyalty").BillingSettings> | null;
  /** Low-stock limit per unit, e.g. { "pcs": 10, "kg": 2 }. Units not listed use low_stock_level. */
  low_stock_limits?: Record<string, number | null> | null;
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
  business_id: string;
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
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  state: string | null;
  gstin: string | null;
  notes: string | null;
  /** Customer ID shown to the user: auto "CUST-0001" or typed in. */
  customer_code: string | null;
  created_at: string;
  updated_at: string;
}

export type RecordType = "invoice" | "billing_record";

export interface Invoice {
  id: string;
  owner_id: string;
  business_id: string;
  customer_id: string | null;
  record_type: RecordType;
  converted_invoice_id: string | null;
  invoice_number: string;
  /** Title printed on the document, e.g. "TAX INVOICE", "BILL OF SUPPLY". */
  doc_title?: string | null;
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
  /** E-way bill details (Professional and Business plans). */
  eway_bill_number?: string | null;
  eway_bill_date?: string | null;
  eway_valid_until?: string | null;
  eway_distance_km?: number | null;
  eway_transporter_id?: string | null;
  /** E-invoice (IRN) details. */
  irn?: string | null;
  irn_ack_no?: string | null;
  irn_date?: string | null;
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
  business_id: string;
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
  business_id: string;
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
  business_id: string;
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
  business_id: string;
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
  business_id: string;
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
  business_id: string;
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
  business_id: string;
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
  business_id: string;
  challan_id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  item_code: string | null;
  created_at: string;
}

export type PaymentStatus = "created" | "paid" | "failed" | "cancelled";
export type PayablePlan = "professional" | "business";

export interface SubscriptionPayment {
  id: string;
  owner_id: string;
  business_id: string;
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
          business_id: string;
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
