"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { searchHsnCodes } from "@/lib/hsnReference";
import type { Product } from "@/types/database";

const OTHER_UNIT = "__other__";

export function ProductFormModal({
  ownerId,
  product,
  itemLabel,
  defaultUnit,
  unitOptions,
  stockTrackingDefault,
  stockHint,
  onClose,
}: {
  ownerId: string;
  product?: Product | null;
  itemLabel: string;
  defaultUnit: string;
  unitOptions: string[];
  stockTrackingDefault: boolean;
  stockHint: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const existingUnitIsKnown = product ? unitOptions.includes(product.unit) : true;

  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [taxPercent, setTaxPercent] = useState(product?.tax_percent?.toString() ?? "0");
  const [unitSelect, setUnitSelect] = useState(
    product ? (existingUnitIsKnown ? product.unit : OTHER_UNIT) : defaultUnit
  );
  const [customUnit, setCustomUnit] = useState(
    product && !existingUnitIsKnown ? product.unit : ""
  );
  const [trackStock, setTrackStock] = useState(
    product ? product.stock_qty !== null : stockTrackingDefault
  );
  const [stockQty, setStockQty] = useState(
    product?.stock_qty != null ? String(product.stock_qty) : "0"
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [itemCode, setItemCode] = useState(product?.item_code ?? "");
  const [hsnCode, setHsnCode] = useState(product?.hsn_code ?? "");
  const [hsnFocused, setHsnFocused] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggest HSN codes from whatever the person is typing into the HSN
  // field itself (by code or by keyword) — falling back to the product
  // name when the HSN field is empty, so a suggestion still appears before
  // they've typed anything into it. There's no free public HSN lookup
  // API, so this searches a built-in reference list instead of a live
  // "fetch".
  const hsnSuggestions = useMemo(
    () => searchHsnCodes(hsnCode.trim() || name),
    [hsnCode, name]
  );

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageRemoved(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const finalUnit = unitSelect === OTHER_UNIT ? customUnit.trim() : unitSelect;

    let imageUrl = product?.image_url ?? null;
    if (imageRemoved) {
      imageUrl = null;
    } else if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(path, imageFile, { upsert: true });
      if (uploadErr) {
        setSaving(false);
        console.error("Zen Biz: failed to upload product image", uploadErr);
        setError(`Couldn't upload image (${uploadErr.message}).`);
        return;
      }
      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(path);
      imageUrl = publicUrlData.publicUrl;
    }

    const payload = {
      owner_id: ownerId,
      name: name.trim(),
      price: parseFloat(price) || 0,
      tax_percent: parseFloat(taxPercent) || 0,
      unit: finalUnit || defaultUnit,
      stock_qty: trackStock ? parseFloat(stockQty) || 0 : null,
      description: description.trim() || null,
      item_code: itemCode.trim() || null,
      hsn_code: hsnCode.trim() || null,
      image_url: imageUrl,
    };

        const { error } = product
      ? await supabase.from("products" as never).update(payload as never).eq("id", product.id)
      : await supabase.from("products" as never).insert(payload as never);
      
    setSaving(false);
    if (error) {
      console.error("Zen Biz: failed to save product", error);
      setError(error.message || "Could not save. Please try again.");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2"
      >
        <h2 className="mb-5 font-display text-xl font-semibold text-text">
          {product ? `Edit ${itemLabel.toLowerCase()}` : `Add ${itemLabel.toLowerCase()}`}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">
              Photo <span className="text-text-soft">(optional)</span>
            </span>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="h-16 w-16 rounded-lg border border-paper-fold object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-paper-fold text-xs text-text-soft">
                  No photo
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="text-sm text-text-soft"
                />
                {imagePreview && (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="self-start text-xs font-medium text-alert"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Price (₹)</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Unit</span>
              <select
                value={unitSelect}
                onChange={(e) => setUnitSelect(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
                <option value={OTHER_UNIT}>Other…</option>
              </select>
            </label>
          </div>

          {unitSelect === OTHER_UNIT && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Custom unit</span>
              <input
                required
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="e.g. dozen, sqft, roll"
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">
              Tax % <span className="text-text-soft">(default for this {itemLabel.toLowerCase()})</span>
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              placeholder="e.g. 5, 12, 18"
              className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
            />
            <span className="text-xs text-text-soft">
              Auto-fills as the tax rate when you add this {itemLabel.toLowerCase()} to an
              invoice, quotation, or purchase — still editable per line.
            </span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">
                Item code <span className="text-text-soft">(optional)</span>
              </span>
              <input
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                placeholder="Your own SKU/code"
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
              />
            </label>
            <label className="relative flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">
                HSN code <span className="text-text-soft">(optional)</span>
              </span>
              <input
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                onFocus={() => setHsnFocused(true)}
                onBlur={() => setTimeout(() => setHsnFocused(false), 120)}
                placeholder="e.g. 7113"
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
              />
              {hsnFocused && hsnSuggestions.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-full overflow-hidden rounded-xl border border-paper-fold bg-white shadow-card">
                  {hsnSuggestions.map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => {
                        setHsnCode(s.code);
                        setHsnFocused(false);
                        // If the product doesn't have a name yet, use the
                        // HSN entry's description as a starting point —
                        // saves retyping when the person searched by code
                        // first and hasn't named the product yet.
                        if (!name.trim()) setName(s.label);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-paper"
                    >
                      <span className="text-text-soft">{s.label}</span>
                      <span className="font-ledger font-semibold text-ink">{s.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </label>
          </div>
          <p className="-mt-2.5 text-xs text-text-soft">
            Type a code (e.g. "71") or a keyword (e.g. "jewellery") to see
            matches from a built-in reference list — always double check
            against the official GST rate finder. HSN code itself is free
            to save on any plan; it only prints on documents once you're on
            the Business plan.
          </p>

          <div className="rounded-xl border border-paper-fold bg-white p-3.5">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-medium text-text">
                Track stock for this {itemLabel.toLowerCase()}
              </span>
              <span className="relative inline-flex shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={trackStock}
                  onChange={(e) => setTrackStock(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-paper-fold transition-colors peer-checked:bg-ink" />
                <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
            <p className="mt-1.5 text-xs text-text-soft">{stockHint}</p>

            {trackStock && (
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text">Current stock quantity</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
                />
              </label>
            )}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">
              Description <span className="text-text-soft">(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
              {error}
            </p>
          )}

          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-paper-fold px-4 py-2.5 text-sm font-semibold text-text-soft transition hover:bg-paper"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
