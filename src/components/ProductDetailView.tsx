"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product, Plan } from "@/types/database";
import { ProductFormModal } from "@/components/ProductFormModal";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function ProductDetailView({
  product,
  itemLabel,
  defaultUnit,
  unitOptions,
  stockTrackingDefault,
  stockHint,
  plan,
}: {
  product: Product;
  itemLabel: string;
  defaultUnit: string;
  unitOptions: string[];
  stockTrackingDefault: boolean;
  stockHint: string;
  plan: Plan;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("products").delete().eq("id", product.id);
    router.push("/dashboard/products");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-6 rounded-xl2 border border-paper-fold bg-paper-card p-6 shadow-card sm:flex-row">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-56 w-full shrink-0 rounded-xl border border-paper-fold object-cover sm:h-48 sm:w-48"
          />
        ) : (
          <div className="flex h-56 w-full shrink-0 items-center justify-center rounded-xl border border-dashed border-paper-fold text-sm text-text-soft sm:h-48 sm:w-48">
            No photo
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-semibold text-text">
                {product.name}
              </h1>
              <p className="text-sm text-text-soft">per {product.unit}</p>
            </div>
            <p className="font-ledger text-2xl font-bold tabular-nums text-ink">
              {formatCurrency(product.price)}
            </p>
          </div>

          {product.description && (
            <p className="text-sm text-text-soft">{product.description}</p>
          )}

          <div className="mt-1 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
                Stock
              </p>
              <p className="mt-0.5 font-ledger text-text">
                {product.stock_qty != null ? `${product.stock_qty} ${product.unit}` : "Not tracked"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
                Tax
              </p>
              <p className="mt-0.5 font-ledger text-text">
                {product.tax_percent > 0 ? `${product.tax_percent}%` : "None"}
              </p>
            </div>
            {product.category && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
                  Category
                </p>
                <p className="mt-0.5 text-text">{product.category}</p>
              </div>
            )}
            {product.item_code && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
                  Item code
                </p>
                <p className="mt-0.5 font-ledger text-text">{product.item_code}</p>
              </div>
            )}
            {product.hsn_code && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
                  HSN code
                </p>
                <p className="mt-0.5 font-ledger text-text">{product.hsn_code}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
                Status
              </p>
              <p className="mt-0.5 text-text">{product.is_active ? "Active" : "Inactive"}</p>
            </div>
          </div>

          <div className="mt-2 flex gap-2 border-t border-paper-fold pt-4">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-lg border border-paper-fold px-4 py-2 text-sm font-semibold text-text transition hover:bg-paper"
            >
              Edit
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-lg border border-alert/30 px-4 py-2 text-sm font-semibold text-alert transition hover:bg-alert-bg"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      {editOpen && (
        <ProductFormModal
          ownerId={product.owner_id}
          product={product}
          itemLabel={itemLabel}
          defaultUnit={defaultUnit}
          unitOptions={unitOptions}
          stockTrackingDefault={stockTrackingDefault}
          stockHint={stockHint}
          plan={plan}
          onClose={() => setEditOpen(false)}
        />
      )}

      {confirmingDelete && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40 backdrop-blur-sm"
          onClick={() => !deleting && setConfirmingDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[340px] rounded-xl2 bg-paper-card p-5 shadow-card"
          >
            <p className="mb-1.5 text-sm font-semibold text-text">
              Remove "{product.name}"?
            </p>
            <p className="mb-4 text-sm text-text-soft">This can't be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="flex-1 rounded-lg border border-paper-fold px-3 py-2 text-sm font-medium text-text transition hover:bg-paper disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-alert px-3 py-2 text-sm font-semibold text-white transition hover:bg-alert/90 disabled:opacity-60"
              >
                {deleting ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
