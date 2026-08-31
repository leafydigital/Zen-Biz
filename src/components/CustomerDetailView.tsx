"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/types/database";
import { CustomerFormModal } from "@/components/CustomerFormModal";

export function CustomerDetailView({ customer }: { customer: Customer }) {
  const router = useRouter();
  const supabase = createClient();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("customers" as never).delete().eq("id", customer.id);
    router.push("/dashboard/customers");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl2 border border-paper-fold bg-paper-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-semibold text-text">{customer.name}</h1>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
              Phone
            </p>
            <p className="mt-0.5 text-text">{customer.phone || "Not provided"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
              Email
            </p>
            <p className="mt-0.5 text-text">{customer.email || "Not provided"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
              Address
            </p>
            <p className="mt-0.5 whitespace-pre-line text-text">
              {customer.address || "Not provided"}
            </p>
          </div>
          {customer.notes && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-text-soft">
                Notes
              </p>
              <p className="mt-0.5 whitespace-pre-line text-text">{customer.notes}</p>
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2 border-t border-paper-fold pt-4">
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

      {editOpen && (
        <CustomerFormModal
          ownerId={customer.owner_id}
          customer={customer}
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
              Remove "{customer.name}"?
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
