"use client";

import { useMemo, useState, useTransition } from "react";
import { saveAlertDays, saveFollowup, setCustomerPlan } from "@/lib/actions/adminActions";
import { daysLeft, dueCustomers, waNumber, type CustomerRow } from "@/lib/customerTypes";

const input = "rounded-xl border border-paper-fold bg-white px-3 py-2 text-sm text-text focus:border-ink focus:outline-none";
const primary = "rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60";
const card = "rounded-xl2 border border-paper-fold bg-white p-4 shadow-card";
type SetMsg = (m: { ok: boolean; text: string } | null) => void;

const PLAN_STYLE: Record<string, string> = {
  starter: "bg-slate-100 text-slate-700",
  professional: "bg-sky-100 text-sky-700",
  business: "bg-violet-100 text-violet-700",
};
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");

function DaysBadge({ iso, alertDays }: { iso: string | null; alertDays: number }) {
  const d = daysLeft(iso);
  if (d === null) return <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">No expiry set</span>;
  if (d < 0) return <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Expired {-d} day{-d === 1 ? "" : "s"} ago</span>;
  if (d <= alertDays) return <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{d === 0 ? "Expires today" : `${d} day${d === 1 ? "" : "s"} left`}</span>;
  return <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">{d} days left</span>;
}

function Contact({ r, reminder, alertDays }: { r: CustomerRow; reminder?: boolean; alertDays?: number }) {
  const d = daysLeft(r.renewsAt);
  const text = reminder
    ? `Hello ${r.name}, your Zen Biz ${r.plan} plan ${d !== null && d < 0 ? "expired on" : "expires on"} ${fmtDate(r.renewsAt)}. Please renew to keep all features. Thank you!`
    : `Hello ${r.name}, this is Zen Biz.`;
  return (
    <div className="flex flex-wrap gap-2">
      {r.phone && (
        <>
          <a target="_blank" rel="noreferrer" href={`https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(text)}`} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">WhatsApp</a>
          <a href={`tel:${r.phone}`} className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">Call</a>
        </>
      )}
      {r.email && (
        <a href={`mailto:${r.email}?subject=${encodeURIComponent("Your Zen Biz plan")}&body=${encodeURIComponent(text)}`} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">Email</a>
      )}
    </div>
  );
}

function Loading({ error }: { error: string | null }) {
  return <p className={`${card} text-sm text-text-soft`}>{error ?? "Loading customers…"}</p>;
}

/* ------------------------------ Customers ------------------------------ */

export function CustomersPanel({
  rows, error, alertDays, canEditPlan, initialPlan, onChanged, setMsg,
}: {
  rows: CustomerRow[] | null; error: string | null; alertDays: number; canEditPlan: boolean;
  initialPlan: string; onChanged: () => void; setMsg: SetMsg;
}) {
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState(initialPlan);
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState<string | null>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (rows ?? []).filter((r) => {
      if (plan !== "all" && r.plan !== plan) return false;
      const d = daysLeft(r.renewsAt);
      if (status === "expired" && !(r.plan !== "starter" && d !== null && d < 0)) return false;
      if (status === "expiring" && !(r.plan !== "starter" && d !== null && d >= 0 && d <= alertDays)) return false;
      if (status === "active" && !(r.plan !== "starter" && (d === null || d > alertDays))) return false;
      if (!s) return true;
      return [r.name, r.email, r.phone, ...r.businesses.map((b) => b.name + b.phone)].join(" ").toLowerCase().includes(s);
    });
  }, [rows, q, plan, status, alertDays]);

  if (!rows) return <Loading error={error} />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or phone" className={`${input} min-w-[220px] flex-1`} />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={input}>
          <option value="all">All plans</option><option value="starter">Starter</option><option value="professional">Professional</option><option value="business">Business</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={input}>
          <option value="all">Any status</option><option value="active">Paid · active</option><option value="expiring">Paid · expiring soon</option><option value="expired">Paid · expired</option>
        </select>
      </div>
      <p className="text-xs text-text-soft">{list.length} of {rows.length} customers</p>

      {list.length === 0 && <p className={`${card} text-sm text-text-soft`}>No customers match.</p>}
      {list.map((r) => (
        <div key={r.id} className={card}>
          <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{r.name}</p>
              <p className="truncate text-xs text-text-soft">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-xs font-semibold capitalize ${PLAN_STYLE[r.plan]}`}>{r.plan}</span>
              {r.plan !== "starter" && <DaysBadge iso={r.renewsAt} alertDays={alertDays} />}
            </div>
          </button>

          {open === r.id && (
            <div className="mt-3 flex flex-col gap-3 border-t border-paper-fold pt-3 text-sm text-text">
              <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                <p><span className="text-text-soft">Email: </span>{r.email || "—"}</p>
                <p><span className="text-text-soft">Phone: </span>{r.phone || "—"}</p>
                <p><span className="text-text-soft">Plan: </span><span className="capitalize">{r.plan}</span>{r.cycle ? ` (${r.cycle})` : ""}</p>
                <p><span className="text-text-soft">Expiry: </span>{r.plan === "starter" ? "Free plan" : fmtDate(r.renewsAt)}</p>
                <p><span className="text-text-soft">Joined: </span>{fmtDate(r.joined)}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-soft">Registered businesses ({r.businesses.length})</p>
                {r.businesses.length === 0 ? <p className="text-xs text-text-soft">None yet.</p> : (
                  <ul className="flex flex-col gap-0.5">
                    {r.businesses.map((b, i) => <li key={i}>{b.name || "Untitled"}{b.phone ? ` · ${b.phone}` : ""}</li>)}
                  </ul>
                )}
              </div>
              <Contact r={r} reminder={r.plan !== "starter"} />
              {canEditPlan && <PlanEditor r={r} onChanged={onChanged} setMsg={setMsg} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PlanEditor({ r, onChanged, setMsg }: { r: CustomerRow; onChanged: () => void; setMsg: SetMsg }) {
  const [plan, setPlan] = useState<string>(r.plan);
  const [cycle, setCycle] = useState<string>(r.cycle ?? "monthly");
  const [date, setDate] = useState(r.renewsAt ? r.renewsAt.slice(0, 10) : "");
  const [busy, start] = useTransition();
  function save() {
    setMsg(null);
    start(async () => {
      const res = await setCustomerPlan(r.id, plan, cycle, date || null);
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Plan updated." });
      if (!res.error) onChanged();
    });
  }
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-xl bg-paper p-3">
      <label className="flex flex-col gap-1 text-xs text-text-soft">Plan
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className={input}>
          <option value="starter">Starter (free)</option><option value="professional">Professional</option><option value="business">Business</option>
        </select>
      </label>
      {plan !== "starter" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-text-soft">Billing
            <select value={cycle} onChange={(e) => setCycle(e.target.value)} className={input}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-soft">Expires on
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </label>
        </>
      )}
      <button disabled={busy} onClick={save} className={primary}>Save plan</button>
    </div>
  );
}

/* ------------------------------ Reminders ------------------------------ */

export function RenewalsPanel({
  rows, error, alertDays, canEdit, onChanged, setMsg, setAlertDays,
}: {
  rows: CustomerRow[] | null; error: string | null; alertDays: number; canEdit: boolean;
  onChanged: () => void; setMsg: SetMsg; setAlertDays: (n: number) => void;
}) {
  const [filter, setFilter] = useState("due");
  const [custom, setCustom] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [days, setDays] = useState(String(alertDays));
  const [busy, start] = useTransition();

  const paid = useMemo(() => (rows ?? []).filter((r) => r.plan !== "starter"), [rows]);
  const list = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const s = q.trim().toLowerCase();
    const within = filter === "custom" ? Math.max(0, Number(custom) || 0) : Number(filter);
    return paid
      .filter((r) => {
        const d = daysLeft(r.renewsAt);
        if (filter === "due") return dueCustomers([r], alertDays).length > 0;
        if (filter === "expired") return d !== null && d < 0;
        if (filter === "none") return d === null;
        if (filter === "followup") return !!r.remindOn && r.remindOn <= todayStr;
        if (filter === "range") {
          if (!r.renewsAt) return false;
          const day = r.renewsAt.slice(0, 10);
          return (!from || day >= from) && (!to || day <= to);
        }
        if (filter === "all") return true;
        return d !== null && d >= 0 && d <= within;
      })
      .filter((r) => !s || [r.name, r.email, r.phone].join(" ").toLowerCase().includes(s))
      .sort((a, b) => (a.renewsAt ?? "9999").localeCompare(b.renewsAt ?? "9999"));
  }, [paid, filter, custom, from, to, q, alertDays]);

  if (!rows) return <Loading error={error} />;

  function saveDays() {
    setMsg(null);
    start(async () => {
      const r = await saveAlertDays(Number(days));
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Alert days saved." });
      if (!r.error) setAlertDays(Number(days));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className={`${card} flex flex-wrap items-end gap-3`}>
        <label className="flex flex-col gap-1 text-xs font-medium text-text-soft">Alert me this many days before a plan ends
          <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} className={`${input} w-28`} disabled={!canEdit} />
        </label>
        {canEdit && <button disabled={busy} onClick={saveDays} className={primary}>Save</button>}
        <p className="text-xs text-text-soft">Paid plans that end within this many days (or already ended) show an alert badge on this tab.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className={input}>
          <option value="due">Needs attention (alert window)</option>
          <option value="7">Ends within 7 days</option>
          <option value="15">Ends within 15 days</option>
          <option value="30">Ends within 30 days</option>
          <option value="custom">Ends within … days</option>
          <option value="range">Expiry date between…</option>
          <option value="expired">Already expired</option>
          <option value="followup">My follow-up date has come</option>
          <option value="none">Paid, no expiry date set</option>
          <option value="all">All paid customers</option>
        </select>
        {filter === "custom" && <input inputMode="numeric" value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))} placeholder="Days" className={`${input} w-24`} />}
        {filter === "range" && (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} />
          </>
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone" className={`${input} min-w-[200px] flex-1`} />
      </div>
      <p className="text-xs text-text-soft">{list.length} of {paid.length} paid customers</p>

      {list.length === 0 && <p className={`${card} text-sm text-text-soft`}>Nothing to show for this filter.</p>}
      {list.map((r) => <RenewalRow key={r.id} r={r} alertDays={alertDays} canEdit={canEdit} onChanged={onChanged} setMsg={setMsg} />)}
    </div>
  );
}

function RenewalRow({ r, alertDays, canEdit, onChanged, setMsg }: { r: CustomerRow; alertDays: number; canEdit: boolean; onChanged: () => void; setMsg: SetMsg }) {
  const [date, setDate] = useState(r.remindOn ?? "");
  const [note, setNote] = useState(r.note ?? "");
  const [busy, start] = useTransition();
  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveFollowup(r.id, date || null, note);
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Reminder saved." });
      if (!res.error) onChanged();
    });
  }
  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-text">{r.name}</p>
          <p className="text-xs text-text-soft">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
          <p className="mt-1 text-xs text-text-soft">
            <span className={`mr-1.5 rounded px-2 py-0.5 font-semibold capitalize ${PLAN_STYLE[r.plan]}`}>{r.plan}</span>
            {r.cycle ?? ""} · ends {fmtDate(r.renewsAt)}
          </p>
        </div>
        <DaysBadge iso={r.renewsAt} alertDays={alertDays} />
      </div>
      <div className="mt-3"><Contact r={r} reminder /></div>
      {canEdit && (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-paper p-3">
          <label className="flex flex-col gap-1 text-xs text-text-soft">Remind me on
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
          </label>
          <label className="flex min-w-[160px] flex-1 flex-col gap-1 text-xs text-text-soft">Note
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. call after 5 pm" className={input} />
          </label>
          <button disabled={busy} onClick={save} className={primary}>Save reminder</button>
        </div>
      )}
      {!canEdit && (r.remindOn || r.note) && <p className="mt-2 text-xs text-text-soft">Reminder: {r.remindOn ? fmtDate(r.remindOn) : ""} {r.note ?? ""}</p>}
    </div>
  );
}
