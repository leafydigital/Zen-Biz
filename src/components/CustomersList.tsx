"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Customer } from "@/types/database";
import { CustomerFormModal } from "@/components/CustomerFormModal";

export function CustomersList({
  ownerId,
  customers,
}: {
  ownerId: string;
  customers: Customer[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search)
  );

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("customers").delete().eq("id", id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Customers</h1>
          <p className="text-sm text-text-soft">Everyone you do business with.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + Add customer
        </button>
      </div>

      {customers.length > 0 && (
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text placeholder:text-text-soft/60 focus:border-ink sm:max-w-xs"
        />
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl2 border border-dashed border-paper-fold bg-paper-card py-14 text-center">
          <p className="text-sm text-text-soft">
            {customers.length === 0
              ? "No customers yet. Add your first one."
              : "Nothing matches your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-4">
                <Link href={`/dashboard/customers/${c.id}`} className="min-w-0 hover:opacity-80">
                  <p className="truncate font-medium text-text underline-offset-2 hover:underline">
                    {c.name}
                  </p>
                  <p className="truncate text-xs text-text-soft">
                    {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact info"}
                  </p>
                  {c.address && (
                    <p className="truncate text-xs text-text-soft">{c.address}</p>
                  )}
                </Link>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/dashboard/customers/${c.id}`}
                    className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => {
                      setEditing(c);
                      setModalOpen(true);
                    }}
                    className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert-bg disabled:opacity-60"
                  >
                    {deletingId === c.id ? "…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalOpen && (
        <CustomerFormModal
          ownerId={ownerId}
          customer={editing}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
