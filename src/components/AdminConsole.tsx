"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SECTIONS, type Level, type Perms, type SectionId } from "@/lib/consoleSections";
import type { ConsoleSession } from "@/lib/adminAuth";
import { WEEK_DAYS, formatWorkingHours, type AppConfig } from "@/lib/appConfigDefaults";
import {
  adminLogout,
  changeMyPassword,
  createConsoleUser,
  createDiscount,
  deleteConsoleUser,
  getTickets,
  resetConsoleUserPassword,
  updateConsoleUser,
  deleteDiscount,
  deleteTicket,
  saveContact,
  savePricing,
  saveVersion,
  toggleDiscount,
  updateTicketStatus,
} from "@/lib/actions/adminActions";

type Ticket = {
  id: string;
  ticket_type: "info" | "issue";
  name: string;
  email: string;
  ticket_no?: number | null;
  phone?: string | null;
  whatsapp_number: string | null;
  address: string | null;
  pincode: string | null;
  notes: string | null;
  message: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  screenshot_signed: string | null;
};
type Discount = {
  id: string;
  code: string;
  kind: "percent" | "flat";
  value: number;
  plans: string[] | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  note: string | null;
};

type Tab = SectionId | "users" | "account";
type CUser = { id: string; username: string; role_name: string; permissions: Perms; active: boolean };

const input = "rounded-xl border border-paper-fold bg-white px-3.5 py-2.5 text-[0.95rem] text-text focus:border-ink focus:outline-none";
const primary = "rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-ink-light disabled:opacity-60";
const card = "rounded-xl2 border border-paper-fold bg-white p-5 shadow-card";

function EyeInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder?: string; className: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="new-password" className={`${className} w-full pr-16`} />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-text-soft hover:text-text">
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/** View / Edit ticks for each section. Edit implies view. */
function PermPicker({ value, onChange }: { value: Perms; onChange: (p: Perms) => void }) {
  const set = (id: SectionId, lvl: Level) => onChange({ ...value, [id]: lvl });
  return (
    <div className="overflow-hidden rounded-xl border border-paper-fold">
      <div className="grid grid-cols-[1fr_64px_64px] bg-paper px-3 py-1.5 text-xs font-semibold text-text-soft">
        <span>Page</span><span className="text-center">View</span><span className="text-center">Edit</span>
      </div>
      {SECTIONS.map(([id, label]) => {
        const lvl = value[id] ?? "none";
        return (
          <div key={id} className="grid grid-cols-[1fr_64px_64px] items-center border-t border-paper-fold px-3 py-2 text-sm text-text">
            <span>{label}</span>
            <span className="text-center">
              <input type="checkbox" className="h-4 w-4 accent-sky-600" checked={lvl === "view" || lvl === "edit"} onChange={(e) => set(id, e.target.checked ? "view" : "none")} />
            </span>
            <span className="text-center">
              <input type="checkbox" className="h-4 w-4 accent-emerald-600" checked={lvl === "edit"} onChange={(e) => set(id, e.target.checked ? "edit" : "view")} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AdminConsole({
  session,
  initialUsers,
  config,
  tickets: initialTickets,
  discounts,
  stats,
}: {
  session: ConsoleSession;
  initialUsers: CUser[];
  config: AppConfig;
  tickets: Ticket[];
  discounts: Discount[];
  stats: { starter: number; professional: number; business: number; businesses: number };
}) {
  const router = useRouter();
  const perms = session.perms;
  const lvl = (id: SectionId): Level => perms[id] ?? "none";
  const visible = SECTIONS.filter(([id]) => lvl(id) !== "none");
  const [tab, setTab] = useState<Tab>((visible[0]?.[0] as Tab) ?? "account");
  const [pending, start] = useTransition();
  const [updated, setUpdated] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [users, setUsers] = useState<CUser[]>(initialUsers);

  // Only the ticket lists refresh themselves — nothing else on the page reloads,
  // so edits in other sections are never lost.
  const refreshTickets = useCallback(async () => {
    const r = await getTickets();
    if (!r.error) {
      setTickets(r.tickets as Ticket[]);
      setUpdated(new Date());
    }
  }, []);
  useEffect(() => {
    if (tab !== "issues" && tab !== "enquiries") return;
    refreshTickets();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshTickets();
    }, 15_000);
    return () => clearInterval(id);
  }, [tab, refreshTickets]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [version, setVersion] = useState(config.version);
  const [contact, setContact] = useState(config.contact);
  const [pricing, setPricing] = useState(config.pricing);
  const [d, setD] = useState({ code: "", kind: "percent" as "percent" | "flat", value: "", plans: [] as string[], maxUses: "", expiresAt: "", note: "" });

  function run(fn: () => Promise<{ error: string | null; code?: string }>, ok: string, refresh = false) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: r.code ? `${ok} ${r.code}` : ok });
      if (!r.error) { if (refresh) refreshTickets(); else router.refresh(); }
    });
  }

  const openCount = (t: "issue" | "info") => tickets.filter((x) => x.ticket_type === t && x.status !== "resolved").length;

  function TicketList({ type }: { type: "issue" | "info" }) {
    const q = query.trim().toLowerCase().replace(/^zb-/, "");
    const list = tickets.filter(
      (t) =>
        t.ticket_type === type &&
        (!q || String(t.ticket_no ?? "").includes(q) || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
    );
    if (list.length === 0) return <p className={`${card} text-sm text-text-soft`}>Nothing here yet.</p>;
    return (
      <div className="flex flex-col gap-3">
        {list.map((t) => (
          <div key={t.id} className={card}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-text">
                  {t.ticket_no ? <span className="mr-2 rounded bg-indigo-50 px-2 py-0.5 font-ledger text-sm text-indigo-700">ZB-{t.ticket_no}</span> : null}
                  {t.name}
                </p>
                <p className="text-xs text-text-soft">
                  {new Date(t.created_at).toLocaleString("en-IN")} ·{" "}
                  <a className="underline" href={`mailto:${t.email}`}>{t.email}</a>
                  {t.phone && (
                    <>
                      {" · "}
                      <a className="underline" href={`tel:${t.phone}`}>Phone {t.phone}</a>
                    </>
                  )}
                  {t.whatsapp_number && (
                    <>
                      {" · "}
                      <a className="underline" target="_blank" rel="noreferrer" href={`https://wa.me/${t.whatsapp_number.replace(/[^0-9]/g, "")}`}>
                        WhatsApp {t.whatsapp_number}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                title="Delete"
                aria-label="Delete ticket"
                onClick={() => { if (window.confirm("Delete this ticket permanently?")) run(() => deleteTicket(t.id), "Ticket deleted.", true); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <select
                value={t.status}
                disabled={pending}
                onChange={(e) => run(() => updateTicketStatus(t.id, e.target.value as Ticket["status"]), "Status updated.", true)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                  t.status === "open" ? "border-red-200 bg-red-50 text-red-700" : t.status === "in_progress" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-text">{t.message}</p>
            {(t.address || t.pincode || t.notes) && (
              <p className="mt-2 text-xs text-text-soft">
                {[t.address, t.pincode, t.notes].filter(Boolean).join(" · ")}
              </p>
            )}
            {t.screenshot_signed && (
              <a href={t.screenshot_signed} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-ink underline">
                View screenshot
              </a>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-paper-fold bg-white px-4 py-3 sm:px-8">
        <h1 className="font-display text-lg font-semibold text-text">Zen Biz · Owner console <span className="ml-2 text-xs font-normal text-text-soft">{session.username} · {session.role}</span></h1>
        <form action={adminLogout}>
          <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Sign out</button>
        </form>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-8">
        <nav className="flex flex-wrap gap-2">
          {[...visible, ...(session.isSuper ? ([["users", "Users & roles"]] as const) : []), ["account", "My account"] as const].map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setTab(id as Tab); setMsg(null); }}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${tab === id ? "bg-ink text-paper" : "bg-white text-text hover:bg-paper-fold/60"}`}
            >
              {label}
              {id === "issues" && openCount("issue") > 0 && <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[0.65rem] text-white">{openCount("issue")}</span>}
              {id === "enquiries" && openCount("info") > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 text-[0.65rem] text-white">{openCount("info")}</span>}
            </button>
          ))}
        </nav>

        {(tab === "issues" || tab === "enquiries") && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refreshTickets()}
            className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            ⟳ Refresh
          </button>
          <span className="text-xs text-text-soft">Updates automatically · last checked {updated.toLocaleTimeString("en-IN")}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticket number, name or email"
            className="ml-auto min-w-[220px] rounded-lg border border-paper-fold bg-white px-3 py-1.5 text-sm text-text focus:border-ink focus:outline-none"
          />
        </div>
        )}
        {tab !== "users" && tab !== "account" && lvl(tab as SectionId) === "view" && (
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">View only — you can look but not change anything here.</p>
        )}

        {msg && <p className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-700" : "bg-alert-bg text-alert"}`}>{msg.text}</p>}

        {tab === "overview" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Starter users", stats.starter, "bg-slate-50 text-slate-700 border-slate-200"],
              ["Professional users", stats.professional, "bg-sky-50 text-sky-700 border-sky-200"],
              ["Business users", stats.business, "bg-violet-50 text-violet-700 border-violet-200"],
              ["Businesses", stats.businesses, "bg-emerald-50 text-emerald-700 border-emerald-200"],
              ["Open problems", openCount("issue"), "bg-red-50 text-red-700 border-red-200"],
              ["Open enquiries", openCount("info"), "bg-amber-50 text-amber-700 border-amber-200"],
              ["App version", config.version, "bg-indigo-50 text-indigo-700 border-indigo-200"],
              ["Active discounts", discounts.filter((x) => x.active).length, "bg-rose-50 text-rose-700 border-rose-200"],
            ].map(([l, v, c]) => (
              <div key={String(l)} className={`rounded-xl2 border p-4 ${c}`}>
                <p className="text-xs font-medium uppercase tracking-wide opacity-80">{l}</p>
                <p className="mt-1.5 font-ledger text-2xl font-semibold">{v}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "issues" && <fieldset disabled={lvl("issues") !== "edit"}><TicketList type="issue" /></fieldset>}
        {tab === "enquiries" && <fieldset disabled={lvl("enquiries") !== "edit"}><TicketList type="info" /></fieldset>}

        {tab === "settings" && (
          <fieldset disabled={lvl("settings") !== "edit"} className="grid gap-4 lg:grid-cols-2">
            <div className={`${card} flex flex-col gap-3`}>
              <h2 className="font-semibold text-text">App version</h2>
              <p className="text-xs text-text-soft">Shown at the bottom of the menu inside the app.</p>
              <input value={version} onChange={(e) => setVersion(e.target.value)} className={input} />
              <button disabled={pending} onClick={() => run(() => saveVersion(version), "Version saved.")} className={primary}>Save version</button>
            </div>
            <div className={`${card} flex flex-col gap-3`}>
              <h2 className="font-semibold text-text">Contact us details</h2>
              <p className="text-xs text-text-soft">Shown on the Contact Us page inside the app.</p>
              {(["email", "whatsapp", "address", "message"] as const).map((k) => (
                <label key={k} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-soft">{k === "message" ? "Short message" : k === "whatsapp" ? "WhatsApp number" : k === "email" ? "Email" : "Address"}</span>
                  <input value={contact[k]} onChange={(e) => setContact({ ...contact, [k]: e.target.value })} className={input} />
                </label>
              ))}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-text-soft">Working days</span>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => {
                    const on = contact.days?.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setContact({ ...contact, days: on ? contact.days.filter((x) => x !== day) : [...(contact.days ?? []), day] })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${on ? "bg-emerald-600 text-white" : "bg-paper text-text-soft hover:bg-paper-fold"}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Opens at</span>
                  <input type="time" value={contact.openTime ?? ""} onChange={(e) => setContact({ ...contact, openTime: e.target.value })} className={input} /></label>
                <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Closes at</span>
                  <input type="time" value={contact.closeTime ?? ""} onChange={(e) => setContact({ ...contact, closeTime: e.target.value })} className={input} /></label>
              </div>
              {formatWorkingHours(contact) && <p className="text-xs text-text-soft">Shows as: {formatWorkingHours(contact)}</p>}
              <button disabled={pending} onClick={() => run(() => saveContact(contact), "Contact details saved.")} className={primary}>Save contact details</button>
            </div>
          </fieldset>
        )}

        {tab === "pricing" && (
          <fieldset disabled={lvl("pricing") !== "edit"} className={`${card} flex flex-col gap-4`}>
            <h2 className="font-semibold text-text">Plan prices (₹)</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["professional", "business"] as const).map((p) => (
                <div key={p} className="flex flex-col gap-2 rounded-xl border border-paper-fold p-4">
                  <p className="text-sm font-semibold capitalize text-text">{p}</p>
                  {(["monthly", "yearly"] as const).map((c) => (
                    <label key={c} className="flex flex-col gap-1">
                      <span className="text-xs font-medium capitalize text-text-soft">{c}</span>
                      <input
                        inputMode="numeric"
                        value={pricing[p][c]}
                        onChange={(e) => setPricing({ ...pricing, [p]: { ...pricing[p], [c]: Number(e.target.value.replace(/\D/g, "")) } })}
                        className={input}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <button disabled={pending} onClick={() => run(() => savePricing(JSON.parse(JSON.stringify(pricing))), "Prices saved.")} className={`${primary} self-start`}>Save prices</button>
            <p className="text-xs text-text-soft">Prices shown in the app update at once. The payment route must read the same prices — see the setup note.</p>
          </fieldset>
        )}

        {tab === "discounts" && (
          <fieldset disabled={lvl("discounts") !== "edit"} className="flex flex-col gap-4">
            <div className={`${card} grid gap-3 sm:grid-cols-2`}>
              <h2 className="font-semibold text-text sm:col-span-2">Generate a discount code</h2>
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Code (leave empty to auto-generate)</span>
                <input value={d.code} onChange={(e) => setD({ ...d, code: e.target.value })} placeholder="e.g. DIWALI25" className={input} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Type</span>
                <select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as "percent" | "flat" })} className={input}>
                  <option value="percent">Percent off (%)</option><option value="flat">Flat amount off (₹)</option></select></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Value</span>
                <input inputMode="decimal" value={d.value} onChange={(e) => setD({ ...d, value: e.target.value.replace(/[^0-9.]/g, "") })} className={input} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Max uses (empty = unlimited)</span>
                <input inputMode="numeric" value={d.maxUses} onChange={(e) => setD({ ...d, maxUses: e.target.value.replace(/\D/g, "") })} className={input} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Valid until (optional)</span>
                <input type="date" value={d.expiresAt} onChange={(e) => setD({ ...d, expiresAt: e.target.value })} className={input} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-text-soft">Note (for you)</span>
                <input value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} className={input} /></label>
              <div className="flex items-center gap-4 text-sm text-text sm:col-span-2">
                <span className="text-xs font-medium text-text-soft">Applies to:</span>
                {["professional", "business"].map((p) => (
                  <label key={p} className="flex items-center gap-1.5 capitalize">
                    <input type="checkbox" className="h-4 w-4 accent-ink" checked={d.plans.includes(p)} onChange={(e) => setD({ ...d, plans: e.target.checked ? [...d.plans, p] : d.plans.filter((x) => x !== p) })} />
                    {p}
                  </label>
                ))}
                <span className="text-xs text-text-soft">(none ticked = both)</span>
              </div>
              <button
                disabled={pending}
                onClick={() =>
                  run(
                    () => createDiscount({ code: d.code, kind: d.kind, value: Number(d.value), plans: d.plans, maxUses: d.maxUses ? Number(d.maxUses) : null, expiresAt: d.expiresAt || null, note: d.note }),
                    "Created code"
                  )
                }
                className={`${primary} self-start`}
              >
                Generate code
              </button>
            </div>

            {discounts.length === 0 ? (
              <p className={`${card} text-sm text-text-soft`}>No codes yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {discounts.map((x) => (
                  <div key={x.id} className={`${card} flex flex-wrap items-center justify-between gap-3 !p-4`}>
                    <div>
                      <p className="font-ledger text-base font-semibold tracking-wide text-text">{x.code}</p>
                      <p className="text-xs text-text-soft">
                        {x.kind === "percent" ? `${x.value}% off` : `₹${x.value} off`} · {x.plans?.length ? x.plans.join(", ") : "all plans"} · used {x.used_count}
                        {x.max_uses !== null ? `/${x.max_uses}` : ""}
                        {x.expires_at ? ` · until ${new Date(x.expires_at).toLocaleDateString("en-IN")}` : ""}
                        {x.note ? ` · ${x.note}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button disabled={pending} onClick={() => run(() => toggleDiscount(x.id, !x.active), x.active ? "Code paused." : "Code activated.")}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white ${x.active ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                        {x.active ? "Pause" : "Activate"}
                      </button>
                      <button disabled={pending} onClick={() => run(() => deleteDiscount(x.id), "Code deleted.")} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {tab === "users" && session.isSuper && <UsersPanel users={users} setUsers={setUsers} setMsg={setMsg} />}
        {tab === "account" && <AccountPanel setMsg={setMsg} />}
      </div>
    </div>
  );
}

type SetMsg = (m: { ok: boolean; text: string } | null) => void;

function AccountPanel({ setMsg }: { setMsg: SetMsg }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, start] = useTransition();
  function save() {
    setMsg(null);
    if (pw !== pw2) return setMsg({ ok: false, text: "The two passwords don't match." });
    start(async () => {
      const r = await changeMyPassword(pw);
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Your password was changed." });
      if (!r.error) { setPw(""); setPw2(""); }
    });
  }
  return (
    <div className={`${card} flex max-w-md flex-col gap-3`}>
      <h2 className="font-semibold text-text">Change my password</h2>
      <p className="text-xs text-text-soft">You're signed in, so you don't need your old password. Use 8+ characters with a capital letter and a symbol.</p>
      <EyeInput value={pw} onChange={setPw} placeholder="New password" className={input} />
      <EyeInput value={pw2} onChange={setPw2} placeholder="Repeat new password" className={input} />
      <button disabled={busy || !pw} onClick={save} className={`${primary} self-start`}>Change password</button>
    </div>
  );
}

function UsersPanel({ users, setUsers, setMsg }: { users: CUser[]; setUsers: (u: CUser[]) => void; setMsg: SetMsg }) {
  const blank = { username: "", password: "", role: "", permissions: {} as Perms };
  const [f, setF] = useState(blank);
  const [busy, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ role: string; permissions: Perms; active: boolean }>({ role: "", permissions: {}, active: true });
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [newPw, setNewPw] = useState("");

  async function reload() {
    const { listConsoleUsers } = await import("@/lib/actions/adminActions");
    const r = await listConsoleUsers();
    if (!r.error) setUsers(r.users as CUser[]);
  }
  function act(fn: () => Promise<{ error: string | null }>, ok: string, after?: () => void) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: ok });
      if (!r.error) { after?.(); await reload(); }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={`${card} flex flex-col gap-3`}>
        <h2 className="font-semibold text-text">Add a user</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} placeholder="Username" autoComplete="off" className={input} />
          <EyeInput value={f.password} onChange={(v) => setF({ ...f, password: v })} placeholder="Password" className={input} />
          <input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} placeholder="Role (e.g. Support)" className={input} />
        </div>
        <PermPicker value={f.permissions} onChange={(p) => setF({ ...f, permissions: p })} />
        <button
          disabled={busy}
          onClick={() => act(() => createConsoleUser(f), "User added.", () => setF(blank))}
          className={`${primary} self-start`}
        >
          Add user
        </button>
      </div>

      {users.length === 0 ? (
        <p className={`${card} text-sm text-text-soft`}>No extra users yet.</p>
      ) : (
        users.map((u) => (
          <div key={u.id} className={`${card} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-text">
                  {u.username} <span className="ml-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">{u.role_name}</span>
                  {!u.active && <span className="ml-1 rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">Disabled</span>}
                </p>
                <p className="text-xs text-text-soft">
                  {SECTIONS.filter(([id]) => (u.permissions?.[id] ?? "none") !== "none").map(([id, l]) => `${l} (${u.permissions[id]})`).join(", ") || "No access"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                  onClick={() => {
                    if (editing === u.id) return setEditing(null);
                    setEditing(u.id); setResetFor(null);
                    setDraft({ role: u.role_name, permissions: u.permissions ?? {}, active: u.active });
                  }}
                >
                  Access
                </button>
                <button
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                  onClick={() => { setResetFor(resetFor === u.id ? null : u.id); setEditing(null); setNewPw(""); }}
                >
                  Change password
                </button>
                <button
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  onClick={() => { if (window.confirm(`Delete user ${u.username}?`)) act(() => deleteConsoleUser(u.id), "User deleted."); }}
                >
                  Delete
                </button>
              </div>
            </div>

            {editing === u.id && (
              <div className="flex flex-col gap-3 border-t border-paper-fold pt-3">
                <div className="flex flex-wrap items-center gap-3">
                  <input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Role" className={`${input} min-w-[180px]`} />
                  <label className="flex items-center gap-1.5 text-sm text-text">
                    <input type="checkbox" className="h-4 w-4 accent-ink" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
                    Can sign in
                  </label>
                </div>
                <PermPicker value={draft.permissions} onChange={(p) => setDraft({ ...draft, permissions: p })} />
                <button disabled={busy} onClick={() => act(() => updateConsoleUser(u.id, draft), "Access saved.", () => setEditing(null))} className={`${primary} self-start`}>
                  Save access
                </button>
              </div>
            )}

            {resetFor === u.id && (
              <div className="flex flex-wrap items-center gap-3 border-t border-paper-fold pt-3">
                <div className="min-w-[220px] flex-1"><EyeInput value={newPw} onChange={setNewPw} placeholder="New password for this user" className={input} /></div>
                <button disabled={busy || !newPw} onClick={() => act(() => resetConsoleUserPassword(u.id, newPw), "Password changed.", () => { setResetFor(null); setNewPw(""); })} className={primary}>
                  Save password
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
