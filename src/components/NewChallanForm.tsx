"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateDeliveryChallanPdf } from "@/lib/generateDeliveryChallanPdf";
import type { Customer, DeliveryChallan, Product, Profile } from "@/types/database";

interface LineItem {
  id: string;
  productId: string | null;
  description: string;
  quantity: number;
  unit: string;
  itemCode: string;
}

function newLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    productId: null,
    description: "",
    quantity: 1,
    unit: "item",
    itemCode: "",
  };
}

export function NewChallanForm({
  ownerId,
  profile,
  customers,
  products,
  suggestedChallanNumber,
}: {
  ownerId: string;
  profile: Profile;
  customers: Customer[];
  products: Product[];
  suggestedChallanNumber: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [challanNumber, setChallanNumber] = useState(suggestedChallanNumber);
  const [challanDate, setChallanDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerId, setCustomerId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(id: string, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function selectProduct(id: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateLine(id, {
      productId: productId || null,
      description: product ? product.name : "",
      unit: product ? product.unit : "item",
      itemCode: product?.item_code ?? "",
    });
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(id: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  }

  async function handleSubmit(e: React.FormEvent, download: boolean) {
    e.preventDefault();
    setError(null);

    const validLines = lines.filter((l) => l.description.trim() && l.quantity > 0);
    if (validLines.length === 0) {
      setError("Add at least one item with a description and quantity.");
      return;
    }
    if (!challanNumber.trim()) {
      setError("Give this challan a number.");
      return;
    }

    setSaving(true);

    const { data: challanData, error: cErr } = await supabase
      .from("delivery_challans")
      .insert({
        owner_id: ownerId,
        customer_id: customerId || null,
        challan_number: challanNumber.trim(),
        challan_date: challanDate,
        status: "draft",
        notes: notes.trim() || null,
      })
      .select()
      .single();

    const challan = challanData as DeliveryChallan | null;

    if (cErr || !challan) {
      setSaving(false);
      console.error("Zen Biz: failed to save delivery challan", cErr);
      setError(cErr?.message ?? "Could not save the challan.");
      return;
    }

    const itemsPayload = validLines.map((l) => ({
      owner_id: ownerId,
      challan_id: challan.id,
      product_id: l.productId,
      description: l.description.trim(),
      quantity: l.quantity,
      unit: l.unit.trim() || "item",
      item_code: l.itemCode.trim() || null,
    }));

    const { error: itemsErr } = await supabase
      .from("delivery_challan_items")
      .insert(itemsPayload);

    setSaving(false);
    if (itemsErr) {
      setError(itemsErr.message);
      return;
    }

    if (download) {
      const customer = customers.find((c) => c.id === customerId) ?? null;
      generateDeliveryChallanPdf({
        challan,
        items: itemsPayload.map((it, i) => ({
          id: String(i),
          owner_id: ownerId,
          challan_id: challan.id,
          product_id: it.product_id,
          description: it.description,
          quantity: it.quantity,
          unit: it.unit,
          item_code: it.item_code,
          created_at: new Date().toISOString(),
        })),
        customer,
        profile,
      });
    }

    router.push("/dashboard/delivery-challans");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Challan number</span>
          <input
            required
            value={challanNumber}
            onChange={(e) => setChallanNumber(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Date</span>
          <input
            type="date"
            required
            value={challanDate}
            onChange={(e) => setChallanDate(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text">Deliver to</span>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
          >
            <option value="">Not specified</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-text">Items to dispatch</span>
          <button
            type="button"
            onClick={addLine}
            className="text-sm font-medium text-ink underline underline-offset-2"
          >
            + Add line
          </button>
        </div>

        <div className="mb-1.5 hidden grid-cols-[1.5fr_0.9fr_0.9fr_28px] gap-3 px-1 text-[0.7rem] font-medium uppercase tracking-wide text-text-soft sm:grid">
          <span>Item</span>
          <span>Quantity</span>
          <span>Unit</span>
          <span />
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className="grid grid-cols-1 gap-2 rounded-xl border border-paper-fold bg-white p-3 sm:grid-cols-[1.5fr_0.9fr_0.9fr_28px] sm:items-center sm:gap-3"
            >
              <div className="flex flex-col gap-1.5">
                <select
                  value={line.productId ?? ""}
                  onChange={(e) => selectProduct(line.id, e.target.value)}
                  className="rounded-lg border border-paper-fold px-2.5 py-2 text-sm text-text focus:border-ink"
                >
                  <option value="">Custom item…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) => updateLine(line.id, { description: e.target.value })}
                  className="rounded-lg border border-paper-fold px-2.5 py-2 text-sm text-text focus:border-ink"
                />
              </div>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Qty"
                aria-label="Quantity"
                value={line.quantity}
                onChange={(e) =>
                  updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })
                }
                className="rounded-lg border border-paper-fold px-2.5 py-2 text-sm text-text focus:border-ink"
              />

              <input
                placeholder="unit"
                aria-label="Unit"
                value={line.unit}
                onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                className="rounded-lg border border-paper-fold px-2.5 py-2 text-sm text-text focus:border-ink"
              />

              <button
                type="button"
                onClick={() => removeLine(line.id)}
                className="justify-self-end text-xs font-semibold text-alert sm:justify-self-center"
                aria-label="Remove line"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text">
          Notes <span className="text-text-soft">(optional)</span>
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={saving}
          onClick={(e) => handleSubmit(e, false)}
          className="flex-1 rounded-xl border border-paper-fold px-4 py-3 text-sm font-semibold text-text transition hover:bg-paper disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save challan"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={(e) => handleSubmit(e, true)}
          className="flex-1 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save & download PDF"}
        </button>
      </div>
    </form>
  );
}
