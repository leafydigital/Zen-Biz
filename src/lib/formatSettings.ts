/**
 * Per-business document formats: numbering (prefix / digits / start) for
 * invoices, quotations, purchases, challans and customers, plus the
 * title texts printed on documents.
 */
export interface NumberFormat {
  prefix: string;
  digits: number;
  start: number;
}

export type NumberKind = "invoice" | "quotation" | "proforma" | "purchase" | "challan" | "customer";

export interface FormatSettings {
  /** Titles offered in the invoice's "Document title" dropdown. */
  invoiceTitles?: string[];
  /** Default title for new invoices. */
  defaultInvoiceTitle?: string;
  titles?: { quotation?: string; purchase?: string };
  numbering?: Partial<Record<NumberKind, Partial<NumberFormat>>>;
}

export const DEFAULT_NUMBERING: Record<NumberKind, NumberFormat> = {
  invoice: { prefix: "INV-", digits: 4, start: 1 },
  quotation: { prefix: "QUO-", digits: 4, start: 1 },
  proforma: { prefix: "PI-", digits: 4, start: 1 },
  purchase: { prefix: "PUR-", digits: 4, start: 1 },
  challan: { prefix: "DC-", digits: 4, start: 1 },
  customer: { prefix: "CUST-", digits: 4, start: 1 },
};

export const NUMBER_KIND_LABELS: Record<NumberKind, string> = {
  invoice: "Invoice number",
  quotation: "Quotation number",
  proforma: "Proforma invoice number",
  purchase: "Purchase number",
  challan: "Delivery challan number",
  customer: "Customer ID",
};

export const DEFAULT_INVOICE_TITLES = ["TAX INVOICE", "INVOICE", "BILL", "BILL OF SUPPLY", "SUPPLY INVOICE"];

export function getNumberFormat(settings: FormatSettings | null | undefined, kind: NumberKind): NumberFormat {
  const d = DEFAULT_NUMBERING[kind];
  const o = settings?.numbering?.[kind] ?? {};
  return {
    prefix: typeof o.prefix === "string" ? o.prefix : d.prefix,
    digits: Math.min(10, Math.max(1, Number(o.digits) || d.digits)),
    start: Math.max(0, Number.isFinite(Number(o.start)) ? Number(o.start) : d.start),
  };
}

export function getInvoiceTitles(settings: FormatSettings | null | undefined): string[] {
  const list = (settings?.invoiceTitles ?? []).map((t) => t.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_INVOICE_TITLES;
}

/** {YYYY} {YY} {MM} in a prefix become the current year / month. */
export function resolvePrefix(prefix: string, date: Date = new Date()): string {
  return prefix
    .replace(/\{YYYY\}/gi, String(date.getFullYear()))
    .replace(/\{YY\}/gi, String(date.getFullYear()).slice(-2))
    .replace(/\{MM\}/gi, String(date.getMonth() + 1).padStart(2, "0"));
}

export function formatNumber(fmt: NumberFormat, n: number, date: Date = new Date()): string {
  return `${resolvePrefix(fmt.prefix, date)}${String(n).padStart(fmt.digits, "0")}`;
}

/** The next free number given the numbers already used. */
export function nextNumberFrom(existing: string[], fmt: NumberFormat, date: Date = new Date()): string {
  const prefix = resolvePrefix(fmt.prefix, date);
  let max = fmt.start - 1;
  for (const value of existing) {
    if (!value.startsWith(prefix)) continue;
    const tail = value.slice(prefix.length);
    if (/^\d+$/.test(tail)) max = Math.max(max, parseInt(tail, 10));
  }
  return formatNumber(fmt, max + 1, date);
}
