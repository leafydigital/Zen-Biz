"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Supplier } from "@/types/database";
import { SupplierFormModal } from "@/components/SupplierFormModal";

export function SuppliersList({
  ownerId,
  suppliers,
}: {
  ownerId: string;
  suppliers: Supplier[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.phone ?? "").includes(search)
  );

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("suppliers" as never).delete().eq("id", id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text">Suppliers</h1>
          <p className="text-sm text-text-soft">Everyone you buy stock or goods from.</p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light"
        >
          + Add supplier
        </button>
      </div>

      {suppliers.length > 0 && (
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
            {suppliers.length === 0
              ? "No suppliers yet. Add your first one."
              : "Nothing matches your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-paper-fold bg-paper-card shadow-card">
          <ul className="divide-y divide-paper-fold">
            {filtered.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 p-4 transition hover:bg-paper/60">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold uppercase text-purple-600">
                    {s.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text">{s.name}</p>
                    <p className="truncate text-xs text-text-soft">
                      {[s.phone, s.email].filter(Boolean).join(" · ") || "No contact info"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setModalOpen(true);
                    }}
                    className="rounded-lg border border-paper-fold px-3 py-1.5 text-xs font-semibold text-text transition hover:bg-paper"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deletingId === s.id}
                    className="rounded-lg border border-alert/30 px-3 py-1.5 text-xs font-semibold text-alert transition hover:bg-alert-bg disabled:opacity-60"
                  >
                    {deletingId === s.id ? "…" : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {modalOpen && (
        <SupplierFormModal
          ownerId={ownerId}
          supplier={editing}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
