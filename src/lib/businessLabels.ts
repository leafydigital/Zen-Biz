/**
 * Business type is free text (chosen from a dropdown, or typed in manually
 * via "Other"), not a fixed enum — any business type the owner types in is
 * accepted and stored exactly as entered. The list below only powers the
 * dropdown UI on the onboarding/settings form.
 */
export const BUSINESS_TYPE_OPTIONS = [
  "Travel Agency",
  "Jewellery Shop",
  "Grocery / Supermarket",
  "Clothing / Apparel",
  "Electronics Shop",
  "Restaurant / Cafe",
  "Salon / Spa",
  "Hardware Store",
  "Pharmacy / Medical Store",
  "Real Estate",
  "Construction / Contractor",
  "Repair / Services",
] as const;

export interface BusinessTypeProfile {
  itemSingular: string;
  itemPlural: string;
  itemHint: string;
  unitDefault: string;
  /** Units shown in the product form's unit dropdown, most relevant first. */
  unitOptions: string[];
  /**
   * Whether stock/quantity tracking is turned on by default for a new
   * product. Travel packages, real estate listings, and pure services have
   * nothing physical to count, so stock tracking defaults off — the owner
   * can still turn it on manually per product if they want to.
   */
  stockTrackingDefault: boolean;
  stockHint: string;
}

const GENERIC_PROFILE: BusinessTypeProfile = {
  itemSingular: "Product / Service",
  itemPlural: "Products & Services",
  itemHint: "Everything you sell — goods or services.",
  unitDefault: "item",
  unitOptions: ["item", "piece", "kg", "gram", "litre", "box", "service"],
  stockTrackingDefault: true,
  stockHint: "Track how many you have left in stock.",
};

/**
 * Per-business-type profiles. Matching is by exact label from
 * BUSINESS_TYPE_OPTIONS — any custom "Other" type the owner types in falls
 * through to GENERIC_PROFILE, which stays sensible for anything.
 */
const BUSINESS_TYPE_PROFILES: Record<string, BusinessTypeProfile> = {
  "Travel Agency": {
    itemSingular: "Package",
    itemPlural: "Packages",
    itemHint: "Tour packages or travel services you offer.",
    unitDefault: "package",
    unitOptions: ["package", "person", "day", "trip", "service"],
    stockTrackingDefault: false,
    stockHint: "Most travel packages aren't stock-counted — leave this off unless you sell a fixed number of seats or slots.",
  },
  "Jewellery Shop": {
    itemSingular: "Item",
    itemPlural: "Items",
    itemHint: "Jewellery items, priced by piece or weight.",
    unitDefault: "gram",
    unitOptions: ["gram", "piece", "carat", "kg"],
    stockTrackingDefault: true,
    stockHint: "Track how many pieces or how much weight you have in stock.",
  },
  "Grocery / Supermarket": {
    itemSingular: "Product",
    itemPlural: "Products",
    itemHint: "Grocery items you stock and sell.",
    unitDefault: "kg",
    unitOptions: ["kg", "gram", "litre", "piece", "packet", "box"],
    stockTrackingDefault: true,
    stockHint: "Track how much you have left in stock.",
  },
  "Clothing / Apparel": {
    itemSingular: "Item",
    itemPlural: "Items",
    itemHint: "Clothing and accessories you sell.",
    unitDefault: "piece",
    unitOptions: ["piece", "set", "pair"],
    stockTrackingDefault: true,
    stockHint: "Track how many pieces you have in stock.",
  },
  "Electronics Shop": {
    itemSingular: "Product",
    itemPlural: "Products",
    itemHint: "Electronics and accessories you sell.",
    unitDefault: "piece",
    unitOptions: ["piece", "set", "unit"],
    stockTrackingDefault: true,
    stockHint: "Track how many units you have in stock.",
  },
  "Restaurant / Cafe": {
    itemSingular: "Menu item",
    itemPlural: "Menu items",
    itemHint: "Dishes and drinks on your menu.",
    unitDefault: "plate",
    unitOptions: ["plate", "piece", "serving", "kg", "litre"],
    stockTrackingDefault: false,
    stockHint: "Most menu items are made fresh, not stock-counted — turn this on only for packaged items you resell.",
  },
  "Salon / Spa": {
    itemSingular: "Service",
    itemPlural: "Services",
    itemHint: "Services you offer, and any products you sell.",
    unitDefault: "service",
    unitOptions: ["service", "session", "piece"],
    stockTrackingDefault: false,
    stockHint: "Turn this on only for retail products you sell, not for services.",
  },
  "Hardware Store": {
    itemSingular: "Product",
    itemPlural: "Products",
    itemHint: "Hardware and building materials you sell.",
    unitDefault: "piece",
    unitOptions: ["piece", "kg", "box", "bag", "metre", "litre"],
    stockTrackingDefault: true,
    stockHint: "Track how many you have left in stock.",
  },
  "Pharmacy / Medical Store": {
    itemSingular: "Product",
    itemPlural: "Products",
    itemHint: "Medicines and health products you sell.",
    unitDefault: "strip",
    unitOptions: ["strip", "box", "bottle", "piece"],
    stockTrackingDefault: true,
    stockHint: "Track how many you have left in stock.",
  },
  "Real Estate": {
    itemSingular: "Listing",
    itemPlural: "Listings",
    itemHint: "Properties or listings you're selling or renting out.",
    unitDefault: "listing",
    unitOptions: ["listing", "property", "unit"],
    stockTrackingDefault: false,
    stockHint: "Listings aren't stock-counted — leave this off.",
  },
  "Construction / Contractor": {
    itemSingular: "Service",
    itemPlural: "Services & materials",
    itemHint: "Services you offer and materials you supply.",
    unitDefault: "service",
    unitOptions: ["service", "sqft", "day", "piece", "bag", "kg"],
    stockTrackingDefault: false,
    stockHint: "Turn this on only for materials you keep stock of, not for labour/services.",
  },
  "Repair / Services": {
    itemSingular: "Service",
    itemPlural: "Services",
    itemHint: "Repair and other services you offer.",
    unitDefault: "service",
    unitOptions: ["service", "piece", "hour"],
    stockTrackingDefault: false,
    stockHint: "Turn this on only for spare parts you keep stock of, not for labour/services.",
  },
};

/**
 * Looks up the right label/unit/stock profile for a business type. Falls
 * back to a sensible generic profile for custom "Other" business types.
 */
export function getLabels(businessType?: string): BusinessTypeProfile {
  if (businessType && BUSINESS_TYPE_PROFILES[businessType]) {
    return BUSINESS_TYPE_PROFILES[businessType];
  }
  return GENERIC_PROFILE;
}
