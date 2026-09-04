"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/I18nContext";

interface SearchResult {
  id: string;
  kind: "invoice" | "customer" | "product";
  title: string;
  subtitle: string;
  href: string;
}

function formatCurrency(n: number, currency: string = "INR") {
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function GlobalSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const [invoicesRes, customersRes, productsRes] = await Promise.all([
        supabase
          .from("invoices" as never)
          .select("id, invoice_number, total, currency, customers(name)")
          .eq("record_type", "invoice")
          .ilike("invoice_number", `%${q}%`)
          .limit(5) as unknown as Promise<{
            data: { id: string; invoice_number: string; total: number; currency: string; customers: { name: string } | null }[] | null;
          }>,
        supabase
          .from("customers" as never)
          .select("id, name, phone")
          .ilike("name", `%${q}%`)
          .limit(5) as unknown as Promise<{ data: { id: string; name: string; phone: string | null }[] | null }>,
        supabase
          .from("products")
          .select("id, name, price")
          .ilike("name", `%${q}%`)
          .limit(5) as unknown as Promise<{ data: { id: string; name: string; price: number }[] | null }>,
      ]);

      const invoiceResults: SearchResult[] = (invoicesRes.data ?? []).map((inv) => ({
        id: inv.id,
        kind: "invoice",
        title: `#${inv.invoice_number}`,
        subtitle: `${inv.customers?.name ?? "Walk-in customer"} · ${formatCurrency(inv.total, inv.currency)}`,
        href: `/dashboard/invoices/${inv.id}`,
      }));
      const customerResults: SearchResult[] = (customersRes.data ?? []).map((c) => ({
        id: c.id,
        kind: "customer",
        title: c.name,
        subtitle: c.phone ?? "No phone on file",
        href: `/dashboard/customers/${c.id}`,
      }));
      const productResults: SearchResult[] = (productsRes.data ?? []).map((p) => ({
        id: p.id,
        kind: "product",
        title: p.name,
        subtitle: formatCurrency(p.price),
        href: `/dashboard/products/${p.id}`,
      }));

      setResults([...invoiceResults, ...customerResults, ...productResults]);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, supabase]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  const kindLabel: Record<SearchResult["kind"], string> = {
    invoice: "Invoice",
    customer: "Customer",
    product: "Item",
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-xl border border-paper-fold bg-white px-3.5 py-2 text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-text-soft" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={t.header.searchPlaceholder}
          className="w-full min-w-0 bg-transparent text-text placeholder:text-text-soft/70 focus:outline-none"
        />
        <kbd className="hidden shrink-0 rounded-md border border-paper-fold px-1.5 py-0.5 text-[0.68rem] font-medium text-text-soft sm:block">
          Ctrl+K
        </kbd>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-paper-fold bg-white shadow-card">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-text-soft">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-soft">
              No matches for "{query}".
            </p>
          ) : (
            <ul className="divide-y divide-paper-fold py-1">
              {results.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelect(r)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-paper"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text">{r.title}</p>
                      <p className="truncate text-xs text-text-soft">{r.subtitle}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-paper px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-text-soft">
                      {kindLabel[r.kind]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
