/**
 * Access areas an owner can tick/untick for a role.
 * Owner and Admin always have everything.
 */
export const PERMISSIONS = [
  { key: "overview", label: "Overview (dashboard home)", paths: [] as string[] },
  { key: "products", label: "Products / Items", paths: ["/dashboard/products", "/dashboard/stock"] },
  { key: "customers", label: "Customers", paths: ["/dashboard/customers"] },
  { key: "invoices", label: "Invoices", paths: ["/dashboard/invoices", "/dashboard/eway-bills", "/dashboard/e-invoices"] },
  { key: "billing", label: "Billing POS (make new bills)", paths: ["/dashboard/billing-records"] },
  { key: "billing_records", label: "Billing records (see past bills)", paths: [] as string[] },
  { key: "billing_add_item", label: "Billing: add item", paths: [] as string[] },
  { key: "billing_edit_item", label: "Billing: edit item", paths: [] as string[] },
  { key: "billing_hide_item", label: "Billing: hide / show item", paths: [] as string[] },
  { key: "billing_remove_item", label: "Billing: remove item", paths: [] as string[] },
  { key: "quotations", label: "Quotations & Proforma invoices", paths: ["/dashboard/quotations", "/dashboard/proforma"] },
  { key: "delivery_challans", label: "Delivery challans", paths: ["/dashboard/delivery-challans"] },
  { key: "purchases", label: "Purchases & suppliers", paths: ["/dashboard/purchases", "/dashboard/suppliers"] },
  { key: "reports", label: "GST & Profit/Loss reports", paths: ["/dashboard/reports", "/dashboard/profit-loss"] },
  { key: "analytics", label: "Dashboard analytics (charts)", paths: [] as string[] },
  { key: "activity_log", label: "Activity log (can see)", paths: [] as string[] },
  { key: "activity_log_delete", label: "Activity log (can delete entries)", paths: [] as string[] },
] as const;

/** Settings sections, each with its own View and Edit tick. */
export const SETTINGS_SECTIONS = [
  { key: "general", label: "Business info" },
  { key: "appearance", label: "Document appearance" },
  { key: "terms", label: "Terms & conditions" },
  { key: "bank", label: "Bank & payment" },
  { key: "format", label: "Number & title formats" },
] as const;

export type SettingsSectionKey = (typeof SETTINGS_SECTIONS)[number]["key"];
export type SettingsLevel = "edit" | "view" | null;

export const SETTINGS_KEYS: string[] = SETTINGS_SECTIONS.flatMap((s) => [
  `settings.${s.key}:view`,
  `settings.${s.key}:edit`,
]);

export type PermissionKey = string;
const BILLING_ONLY_EXTRAS = [
  "billing", "billing_records", "billing_add_item", "billing_edit_item", "billing_hide_item", "billing_remove_item",
  "analytics", "activity_log", "activity_log_delete",
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = [...PERMISSIONS.map((p) => p.key), ...SETTINGS_KEYS];

/** Access level for one settings section. The old single "settings" tick means edit on all. */
export function settingsLevel(perms: string[], section: SettingsSectionKey): SettingsLevel {
  if (perms.includes("settings") || perms.includes(`settings.${section}:edit`)) return "edit";
  if (perms.includes(`settings.${section}:view`)) return "view";
  return null;
}

/** What the built-in Manager / Staff roles can access. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  manager: PERMISSIONS.map((p) => p.key),
  staff: ["overview", "products", "customers", "invoices", "billing", "billing_records", "billing_hide_item", "quotations"],
  member: ["overview", "products", "customers", "invoices", "billing", "billing_records", "billing_hide_item", "quotations"],
};

/** The Billing area opens with either billing tick (POS or records). */
export function hasPermission(perms: string[], key: PermissionKey): boolean {
  if (key === "billing") return perms.includes("billing") || perms.includes("billing_records");
  return perms.includes(key);
}

/** True when billing is the only thing this role can reach: no other page, no settings. */
export function isBillingOnly(perms: string[]): boolean {
  if (!hasPermission(perms, "billing")) return false;
  return !perms.some(
    (k) => k === "settings" || k.startsWith("settings.") || (PERMISSIONS.some((p) => p.key === k) && !BILLING_ONLY_EXTRAS.includes(k))
  );
}

/** Where to send someone whose role can't open the Overview page. */
export function firstAllowedPath(perms: string[]): string {
  if (hasPermission(perms, "billing")) return "/dashboard/billing-records";
  for (const p of PERMISSIONS) {
    if (p.paths.length > 0 && perms.includes(p.key)) return p.paths[0];
  }
  return "/dashboard/settings";
}

export function permissionForPath(pathname: string): PermissionKey | null {
  for (const p of PERMISSIONS) {
    if (p.paths.some((x) => pathname === x || pathname.startsWith(x + "/"))) return p.key;
  }
  return null;
}
