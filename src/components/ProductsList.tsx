"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Product, Plan } from "@/types/database";
import { ProductFormModal } from "@/components/ProductFormModal";
import { LimitReachedModal } from "@/components/LimitReachedModal";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function ProductsList({
  ownerId,
  products,
  itemLabel,
  itemLabelPlural,
  defaultUnit,
  unitOptions,
  stockTrackingDefault,
  stockHint,
  itemHint,
  plan,
  productLimit,
}: {
  ownerId: string;
  products: Product[];
  itemLabel: string;
  itemLabelPlural: string;
  defaultUnit: string;
  unitOptions: string[];
  stockTrackingDefault: boolean;
  stockHint: string;
  itemHint: string;
  plan: Plan;
  productLimit: number | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const atLimit = productLimit !== null && products.length >= productLimit;

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("products").delete().eq("id", id);
    setDeletingId(null);
    router.refresh();
  }

  function handleAddClick() {
    if (atLimit) {
      setLimitModalOpen(true);
      return;
    }
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">
            {itemLabelPlural}
          </h1>
          <p className="text-sm text-text-soft">
            {itemHint}
            {productLimit !== null && (
              <span className={atLimit ? "ml-1 font-medium text-alert" : "ml-1"}>
                {products.length} / {productLimit} used
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + Add {itemLabel.toLowerCase()}
        </button>
      </div>

      {products.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${itemLabelPlural.toLowerCase()}…`}
          className="w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink sm:max-w-xs"
        />
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">
            {products.length === 0
              ? `No ${itemLabelPlural.toLowerCase()} yet. Add your first one.`
              : "Nothing matches your search."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 rounded-xl2 border border-paper-fold bg-white p-4 shadow-card transition hover:border-ink/20 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/dashboard/products/${p.id}`}
                  className="flex items-center gap-3 hover:opacity-80"
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-11 w-11 shrink-0 rounded-lg border border-paper-fold object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5ZM4 8l8 4.5M12 12.5V21M12 12.5 20 8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <p className="font-medium text-text underline-offset-2 hover:underline">
                    {p.name}
                  </p>
                </Link>
                <p className="font-ledger whitespace-nowrap text-sm font-semibold tabular-nums text-ink">
                  {formatCurrency(p.price)}
                </p>
              </div>
              <p className="text-xs text-text-soft">
                per {p.unit}
                {p.stock_qty != null ? ` · ${p.stock_qty} in stock` : ""}
                {p.tax_percent > 0 ? ` · ${p.tax_percent}% tax` : ""}
              </p>
              {(p.item_code || p.hsn_code) && (
                <p className="font-ledger text-[0.7rem] text-text-soft">
                  {p.item_code && `Code: ${p.item_code}`}
                  {p.item_code && p.hsn_code && "  ·  "}
                  {p.hsn_code && `HSN: ${p.hsn_code}`}
                </p>
              )}
              {p.description && (
                <p className="line-clamp-2 text-sm text-text-soft">{p.description}</p>
              )}
              <div className="mt-2 flex gap-2 border-t border-paper-fold pt-3">
                <Link
                  href={`/dashboard/products/${p.id}`}
                  className="flex-1 rounded-lg border border-paper-fold py-1.5 text-center text-xs font-semibold text-text transition hover:bg-paper"
                >
                  View
                </Link>
                <button
                  onClick={() => {
                    setEditing(p);
                    setModalOpen(true);
                  }}
                  className="flex-1 rounded-lg border border-paper-fold py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  disabled={deletingId === p.id}
                  className="flex-1 rounded-lg border border-alert/30 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert-bg disabled:opacity-60"
                >
                  {deletingId === p.id ? "Removing…" : "Remove"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ProductFormModal
          ownerId={ownerId}
          product={editing}
          itemLabel={itemLabel}
          defaultUnit={defaultUnit}
          unitOptions={unitOptions}
          stockTrackingDefault={stockTrackingDefault}
          stockHint={stockHint}
          plan={plan}
          onClose={() => setModalOpen(false)}
        />
      )}

      {limitModalOpen && productLimit !== null && (
        <LimitReachedModal
          kind="products"
          limit={productLimit}
          currentPlan={plan}
          onClose={() => setLimitModalOpen(false)}
        />
      )}
    </div>
  );
}
