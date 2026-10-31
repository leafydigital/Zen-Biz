import type { SupabaseClient } from "@supabase/supabase-js";
import { getNumberFormat, nextNumberFrom, resolvePrefix, type FormatSettings, type NumberKind } from "@/lib/formatSettings";

const TABLES: Record<Exclude<NumberKind, "customer">, { table: string; column: string }> = {
  invoice: { table: "invoices", column: "invoice_number" },
  quotation: { table: "quotations", column: "quotation_number" },
  purchase: { table: "purchases", column: "purchase_number" },
  challan: { table: "delivery_challans", column: "challan_number" },
};

/**
 * Next number for a business, from the highest number already used with
 * the same prefix (so deleting a document never causes a repeat), never
 * lower than the "start at" value in Settings → Formats.
 */
export async function getNextDocumentNumber(
  supabase: SupabaseClient,
  kind: Exclude<NumberKind, "customer">,
  businessId: string,
  settings: FormatSettings | null | undefined
): Promise<string> {
  const fmt = getNumberFormat(settings, kind);
  const { table, column } = TABLES[kind];
  const prefix = resolvePrefix(fmt.prefix);

  let query = supabase
    .from(table)
    .select(column)
    .eq("business_id", businessId)
    .like(column, `${prefix.replace(/[%_]/g, (c) => `\\${c}`)}%`)
    .order("created_at", { ascending: false })
    .limit(500);
  if (kind === "invoice") query = query.eq("record_type", "invoice");

  const { data } = await query;
  const existing = ((data ?? []) as unknown as Record<string, string>[]).map((r) => String(r[column] ?? ""));
  return nextNumberFrom(existing, fmt);
}
