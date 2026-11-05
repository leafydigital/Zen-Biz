"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchCategoryList, mergeCategories, saveCategoryList } from "@/lib/categories";

const inputCls = "min-w-0 flex-1 rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink";

export function GearIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.62.8 1.03 1.46 1.03H21a2 2 0 1 1 0 4h-.09c-.66 0-1.26.41-1.51 1.03Z" />
    </svg>
  );
}

/** Add, rename and delete the categories used by items. */
export function CategoryManagerModal({
  businessId,
  products,
  onClose,
}: {
  businessId: string;
  products: { category: string | null }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [stored, setStored] = useState<string[] | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategoryList(supabase as never, businessId).then(setStored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) {
      const c = p.category?.trim();
      if (c) m[c] = (m[c] ?? 0) + 1;
    }
    return m;
  }, [products]);

  const list = useMemo(() => mergeCategories(stored, Object.keys(counts)), [stored, counts]);
  const exists = (name: string, except?: string) =>
    list.some((c) => c.toLowerCase() === name.toLowerCase() && c !== except);

  async function persist(next: string[]) {
    const err = await saveCategoryList(supabase as never, businessId, next);
    if (err) {
      setError(err);
      return false;
    }
    setStored(mergeCategories(next));
    return true;
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    if (exists(name)) return setError(`"${name}" is already in the list.`);
    setBusy(true);
    setError(null);
    if (await persist([...list, name])) setNewName("");
    setBusy(false);
  }

  async function rename(old: string) {
    const name = editName.trim();
    if (!name) return;
    if (name === old) return setEditing(null);
    if (exists(name, old)) return setError(`"${name}" is already in the list.`);
    setBusy(true);
    setError(null);
    if (await persist(list.map((c) => (c === old ? name : c)))) {
      // Items using the old name move to the new one.
      const { error: err } = await supabase
        .from("products" as never)
        .update({ category: name } as never)
        .eq("business_id", businessId)
        .eq("category", old);
      if (err) setError(err.message);
      else {
        setEditing(null);
        router.refresh();
      }
    }
    setBusy(false);
  }

  async function remove(name: string) {
    setBusy(true);
    setError(null);
    if (await persist(list.filter((c) => c !== name))) {
      // Items keep existing, they just have no category any more.
      const { error: err } = await supabase
        .from("products" as never)
        .update({ category: null } as never)
        .eq("business_id", businessId)
        .eq("category", name);
      if (err) setError(err.message);
      else {
        setConfirmDelete(null);
        router.refresh();
      }
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-t-xl2 bg-paper-card p-6 shadow-card sm:rounded-xl2"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-text">Categories</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-text-soft hover:bg-paper">
            Close
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void add()}
            placeholder="New category, e.g. Drinks"
            className={inputCls}
          />
          <button
            onClick={add}
            disabled={busy || !newName.trim()}
            className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-paper disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {error && <p className="rounded-lg bg-alert/10 px-3 py-2 text-sm text-alert">{error}</p>}

        {stored === null ? (
          <p className="text-sm text-text-soft">Loading…</p>
        ) : list.length === 0 ? (
          <p className="rounded-xl border border-dashed border-paper-fold py-6 text-center text-sm text-text-soft">
            No categories yet. Add your first one above, then pick it when adding items.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((c) => (
              <li key={c} className="flex items-center gap-2 rounded-xl border border-paper-fold bg-white px-3 py-2">
                {editing === c ? (
                  <>
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && void rename(c)}
                      className={inputCls}
                    />
                    <button onClick={() => rename(c)} disabled={busy} className="text-xs font-semibold text-ink">
                      Save
                    </button>
                    <button onClick={() => setEditing(null)} className="text-xs text-text-soft">
                      Cancel
                    </button>
                  </>
                ) : confirmDelete === c ? (
                  <>
                    <span className="flex-1 text-sm text-text">
                      Delete “{c}”? {counts[c] ? `${counts[c]} item(s) will have no category.` : ""}
                    </span>
                    <button onClick={() => remove(c)} disabled={busy} className="text-xs font-semibold text-alert">
                      Delete
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="text-xs text-text-soft">
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{c}</span>
                    <span className="text-xs text-text-soft">{counts[c] ?? 0} items</span>
                    <button
                      onClick={() => {
                        setEditing(c);
                        setEditName(c);
                        setError(null);
                      }}
                      className="text-xs font-semibold text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDelete(c);
                        setError(null);
                      }}
                      className="text-xs font-semibold text-alert"
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
