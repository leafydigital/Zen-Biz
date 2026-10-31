/**
 * Access areas an owner can tick/untick for a role.
 * Owner and Admin always have everything.
 */
export const PERMISSIONS = [
  { key: "products", label: "Products / Items", paths: ["/dashboard/products"] },
  { key: "customers", label: "Customers", paths: ["/dashboard/customers"] },
  { key: "invoices", label: "Invoices & billing records", paths: ["/dashboard/invoices", "/dashboard/billing-records"] },
  { key: "quotations", label: "Quotations", paths: ["/dashboard/quotations"] },
  { key: "delivery_challans", label: "Delivery challans", paths: ["/dashboard/delivery-challans"] },
  { key: "purchases", label: "Purchases & suppliers", paths: ["/dashboard/purchases", "/dashboard/suppliers"] },
  { key: "reports", label: "GST & Profit/Loss reports", paths: ["/dashboard/reports", "/dashboard/profit-loss"] },
  { key: "analytics", label: "Dashboard analytics (charts)", paths: [] as string[] },
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
  staff: ["products", "customers", "invoices", "quotations"],
  member: ["products", "customers", "invoices", "quotations"],
};

export function permissionForPath(pathname: string): PermissionKey | null {
  for (const p of PERMISSIONS) {
    if (p.paths.some((x) => pathname === x || pathname.startsWith(x + "/"))) return p.key;
  }
  return null;
}
