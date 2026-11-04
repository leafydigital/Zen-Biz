"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteActivityLogs,
  loadActivityLogs,
  setLogRetention,
  type ActivityLogEntry,
} from "@/lib/actions/activityLogActions";

const RETENTION_OPTIONS = [
  { value: "", label: "Keep forever" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
];

const ACTION_STYLE: Record<string, string> = {
  created: "bg-success-bg text-success",
  updated: "bg-brass/15 text-brass-dark",
  deleted: "bg-alert-bg text-alert",
};

export function ActivityLogTab({
  isOwner,
  canDelete,
  retentionDays,
}: {
  isOwner: boolean;
  canDelete: boolean;
  retentionDays: number | null;
}) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retention, setRetention] = useState(retentionDays ? String(retentionDays) : "");
  const [before, setBefore] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (offset: number, term: string) => {
      setLoading(true);
      const res = await loadActivityLogs(offset, term);
      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setLogs((cur) => (offset === 0 ? res.logs : [...cur, ...res.logs]));
      setHasMore(res.hasMore);
    },
    []
  );

  useEffect(() => {
    const id = setTimeout(() => load(0, search), 250);
    return () => clearTimeout(id);
  }, [search, load]);

  async function remove(input: { ids?: string[]; before?: string; all?: boolean }, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    const res = await deleteActivityLogs(input);
    if (res.error) return setError(res.error);
    setNotice("Deleted permanently.");
    load(0, search);
  }

  async function saveRetention() {
    setSaving(true);
    setNotice(null);
    const res = await setLogRetention(retention ? Number(retention) : null);
    setSaving(false);
    if (res.error) return setError(res.error);
    setError(null);
    setNotice(retention ? `Entries older than ${retention} days are now deleted automatically.` : "Log entries are kept forever.");
    load(0, search);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-text">Activity log</h2>
        <p className="text-sm text-text-soft">Who added, changed or deleted something, and when.</p>
      </div>

      {isOwner && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-paper-fold bg-white p-3.5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-text">Auto-delete entries older than</span>
            <select
              value={retention}
              onChange={(e) => setRetention(e.target.value)}
              className="rounded-lg border border-paper-fold bg-white px-3 py-2 text-sm text-text"
            >
              {RETENTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={saveRetention}
            disabled={saving}
            className="rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-paper hover:bg-ink-light disabled:opacity-70"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <p className="basis-full text-xs text-text-soft">Auto-deleted entries are removed permanently and cannot be recovered.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user, item or change…"
          className="min-w-0 flex-1 rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-sm text-text placeholder:text-text-soft/60 focus:border-ink sm:max-w-xs sm:flex-none"
        />
        {canDelete && (
          <>
            <input
              type="date"
              value={before}
              onChange={(e) => setBefore(e.target.value)}
              className="rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text"
              aria-label="Delete entries before this date"
            />
            <button
              type="button"
              disabled={!before}
              onClick={() => remove({ before }, `Permanently delete all log entries before ${before}?`)}
              className="rounded-xl border border-alert/30 px-3 py-2 text-sm font-semibold text-alert hover:bg-alert-bg disabled:opacity-50"
            >
              Delete before date
            </button>
            <button
              type="button"
              onClick={() => remove({ all: true }, "Permanently delete the ENTIRE activity log?")}
              className="rounded-xl border border-alert/30 px-3 py-2 text-sm font-semibold text-alert hover:bg-alert-bg"
            >
              Clear all
            </button>
          </>
        )}
      </div>

      {error && <p className="rounded-lg bg-alert-bg px-3.5 py-2.5 text-sm text-alert">{error}</p>}
      {notice && !error && <p className="rounded-lg bg-success-bg px-3.5 py-2.5 text-sm text-success">{notice}</p>}

      {logs.length === 0 && !loading ? (
        <p className="rounded-xl border border-dashed border-paper-fold py-10 text-center text-sm text-text-soft">No activity recorded.</p>
      ) : (
        <ul className="divide-y divide-paper-fold overflow-hidden rounded-xl border border-paper-fold bg-white">
          {logs.map((l) => (
            <li key={l.id} className="flex items-start justify-between gap-3 px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm text-text">
                  <span className="font-semibold">{l.user_name}</span>{" "}
                  <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${ACTION_STYLE[l.action] ?? "bg-paper-fold text-text-soft"}`}>
                    {l.action}
                  </span>{" "}
                  {l.entity}
                  {l.entity_name ? <span className="text-text-soft"> — {l.entity_name}</span> : null}
                </p>
                {l.details && <p className="mt-0.5 break-words text-xs text-text-soft">{l.details}</p>}
                <p className="mt-0.5 text-[0.7rem] text-text-soft/80">
                  {new Date(l.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => remove({ ids: [l.id] }, "Delete this log entry permanently?")}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-alert hover:bg-alert-bg"
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {loading && <p className="text-center text-sm text-text-soft">Loading…</p>}
      {hasMore && !loading && (
        <button
          type="button"
          onClick={() => load(logs.length, search)}
          className="self-center rounded-xl border border-paper-fold px-4 py-2 text-sm font-semibold text-text hover:bg-paper"
        >
          Load more
        </button>
      )}
    </div>
  );
}
