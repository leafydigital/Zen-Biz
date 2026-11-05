/**
 * The business's saved category list (businesses.product_categories). Items
 * keep their category as plain text, so categories already used on items are
 * always shown too, even if they were never added to the saved list.
 */
interface Db {
  from: (t: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const MISSING_COLUMN_HELP = "Run supabase/migration_46.sql in the Supabase SQL editor to save categories.";

export function mergeCategories(...lists: (string[] | null | undefined)[]): string[] {
  const seen = new Map<string, string>();
  for (const list of lists)
    for (const raw of list ?? []) {
      const c = String(raw).trim();
      if (c && !seen.has(c.toLowerCase())) seen.set(c.toLowerCase(), c);
    }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

export async function fetchCategoryList(supabase: Db, businessId: string): Promise<string[]> {
  const { data, error } = await supabase.from("businesses").select("product_categories").eq("id", businessId).maybeSingle();
  if (error || !Array.isArray(data?.product_categories)) return [];
  return mergeCategories(data.product_categories);
}

/** Saves the list. Returns an error message, or null when saved. */
export async function saveCategoryList(supabase: Db, businessId: string, list: string[]): Promise<string | null> {
  const { error } = await supabase
    .from("businesses")
    .update({ product_categories: mergeCategories(list) })
    .eq("id", businessId);
  if (!error) return null;
  return /product_categories/.test(error.message) ? MISSING_COLUMN_HELP : error.message;
}
