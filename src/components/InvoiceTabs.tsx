import Link from "next/link";

const TABS = [
  { id: "invoices", label: "Invoices", href: "/dashboard/invoices" },
  { id: "eway", label: "E-way Bill", href: "/dashboard/eway-bills" },
  { id: "einvoice", label: "E-invoice", href: "/dashboard/e-invoices" },
] as const;

/** Switches between Invoices, E-way Bill and E-invoice, all kept under the Invoices menu. */
export function InvoiceTabs({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto">
      {TABS.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold ${active === t.id ? "border-ink bg-ink text-paper" : "border-paper-fold bg-white text-text-soft hover:bg-paper"}`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
