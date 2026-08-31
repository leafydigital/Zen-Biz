"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { INDIAN_STATE_NAMES } from "@/lib/indianStates";
import type { Customer } from "@/types/database";

export function CustomerFormModal({
  ownerId,
  customer,
  onClose,
}: {
  ownerId: string;
  customer?: Customer | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [state, setState] = useState(customer?.state ?? "");
  const [gstin, setGstin] = useState(customer?.gstin ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      owner_id: ownerId,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      state: state || null,
      gstin: gstin.trim() || null,
      notes: notes.trim() || null,
    };

    const { error } = customer
      ? await supabase.from("customers").update(payload).eq("id", customer.id)
      : await supabase.from("customers").insert(payload);

    setSaving(false);
    if (error) {
      setError(error.message);
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
          {customer ? "Edit customer" : "Add customer"}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text">Address</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">
                State <span className="text-text-soft">(for GST)</span>
              </span>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink"
              >
                <option value="">Select state…</option>
                {INDIAN_STATE_NAMES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-text">
                GSTIN <span className="text-text-soft">(optional)</span>
              </span>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="15-digit GSTIN"
                className="rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink"
              />
            </label>
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
