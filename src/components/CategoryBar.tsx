"use client";

import { useMemo } from "react";

/** Category names used by a list of items, sorted. Items without a category are left out. */
export function categoriesOf(items: { category: string | null }[]): string[] {
  return Array.from(new Set(items.map((p) => p.category?.trim()).filter(Boolean) as string[])).sort((a, b) =>
    a.localeCompare(b)
  );
}

export const inCategory = (item: { category: string | null }, category: string | null) =>
  category === null || (item.category?.trim() ?? "") === category;

/** Row of big tap-friendly category buttons: "All" first, then each category with its item count. */
export function CategoryBar({
  items,
  value,
  onChange,
}: {
  items: { category: string | null }[];
  value: string | null;
  onChange: (c: string | null) => void;
}) {
  const categories = useMemo(() => categoriesOf(items), [items]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of items) {
      const c = p.category?.trim();
      if (c) m[c] = (m[c] ?? 0) + 1;
    }
    return m;
  }, [items]);

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categories">
      {[null, ...categories].map((c) => {
        const active = value === c;
        return (
          <button
            key={c ?? "__all"}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(c)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition active:scale-95 ${
              active
                ? "border-ink bg-ink text-paper"
                : "border-paper-fold bg-white text-text hover:border-ink/40 hover:bg-paper"
            }`}
          >
            {c ?? "All"}
            <span className={`ml-1.5 text-xs font-medium ${active ? "text-paper/70" : "text-text-soft"}`}>
              {c === null ? items.length : counts[c]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
