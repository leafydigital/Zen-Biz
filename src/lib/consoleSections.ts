/** Owner-console sections and the access levels a console user can be given. */
export const SECTIONS = [
  ["overview", "Overview"],
  ["customers", "Customers"],
  ["renewals", "Payment reminders"],
  ["issues", "Problems raised"],
  ["enquiries", "Enquiries"],
  ["settings", "Version & contact"],
  ["pricing", "Plan prices"],
  ["discounts", "Discounts"],
  ["payments", "Payments (Razorpay)"],
] as const;

export type SectionId = (typeof SECTIONS)[number][0];
export type Level = "none" | "view" | "edit";
export type Perms = Partial<Record<SectionId, Level>>;

export const allEdit = (): Perms => Object.fromEntries(SECTIONS.map(([id]) => [id, "edit"])) as Perms;

export function cleanPerms(p: unknown): Perms {
  const out: Perms = {};
  for (const [id] of SECTIONS) {
    const v = (p as Record<string, unknown> | null)?.[id];
    out[id] = v === "edit" ? "edit" : v === "view" ? "view" : "none";
  }
  return out;
}
