import type { SupportTicket } from "@/types/database";

const STEPS = [
  ["open", "Received"],
  ["in_progress", "In progress"],
  ["resolved", "Resolved"],
] as const;

export function MyTickets({ tickets }: { tickets: SupportTicket[] }) {
  if (tickets.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-display text-lg font-semibold text-text">Your tickets</h2>
      {tickets.map((t) => {
        const at = STEPS.findIndex((s) => s[0] === t.status);
        return (
          <div key={t.id} className="rounded-xl2 border border-paper-fold bg-white p-4 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text">
                {t.ticket_no ? <span className="mr-2 font-ledger text-ink">ZB-{t.ticket_no}</span> : null}
                {t.ticket_type === "issue" ? "Problem reported" : "Enquiry"}
                <span className="ml-2 text-xs font-normal text-text-soft">{new Date(t.created_at).toLocaleDateString("en-IN")}</span>
              </p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  t.status === "open" ? "bg-red-50 text-red-700" : t.status === "in_progress" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"
                }`}
              >
                {STEPS[at]?.[1] ?? t.status}
              </span>
            </div>
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-text-soft">{t.message}</p>
            <ol className="mt-3 flex items-center gap-2 text-xs">
              {STEPS.map((s, i) => (
                <li key={s[0]} className="flex flex-1 items-center gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold ${i <= at ? "bg-emerald-600 text-white" : "bg-paper-fold text-text-soft"}`}>{i <= at ? "✓" : i + 1}</span>
                  <span className={i <= at ? "font-medium text-text" : "text-text-soft"}>{s[1]}</span>
                  {i < STEPS.length - 1 && <span className={`h-px flex-1 ${i < at ? "bg-emerald-600" : "bg-paper-fold"}`} />}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
