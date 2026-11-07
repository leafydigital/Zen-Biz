/** Income & Expenses ledger helpers. */
export interface CashEntry {
  id: string;
  kind: "income" | "expense";
  category: string;
  amount: number | string;
  entry_date: string; // YYYY-MM-DD
  note: string | null;
  repeat_monthly: boolean;
  repeat_until: string | null;
}

export interface CashOccurrence {
  /** Entry id (a repeating entry yields several rows with the same id). */
  id: string;
  date: string;
  kind: "income" | "expense";
  category: string;
  amount: number;
  note: string | null;
  repeating: boolean;
}

export const INCOME_CATEGORIES = ["Outside income", "Business income", "Interest", "Commission", "Rent received", "Other income"];
export const EXPENSE_CATEGORIES = [
  "Salary",
  "Petrol / Fuel",
  "Rent",
  "Electricity",
  "Internet / Phone",
  "Transport",
  "Repairs",
  "Tea / Food",
  "Marketing",
  "Tax / Fees",
  "Other expense",
];

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Turns saved entries into dated rows inside [from, to]. A monthly entry repeats on
 * the same day every month (clamped to the month's last day) from its start date until
 * repeat_until, or until today if no end date is set. Nothing is stored per month.
 */
export function expandCashEntries(entries: CashEntry[], from: string, to: string, today: string = new Date().toISOString().slice(0, 10)): CashOccurrence[] {
  const out: CashOccurrence[] = [];
  for (const e of entries) {
    const base = {
      id: e.id,
      kind: e.kind,
      category: e.category,
      amount: Number(e.amount) || 0,
      note: e.note,
      repeating: e.repeat_monthly,
    };
    if (!e.repeat_monthly) {
      if (e.entry_date >= from && e.entry_date <= to) out.push({ ...base, date: e.entry_date });
      continue;
    }
    const [sy, sm, sd] = e.entry_date.split("-").map(Number);
    const last = e.repeat_until && e.repeat_until < today ? e.repeat_until : today;
    let y = sy;
    let m = sm;
    for (let guard = 0; guard < 600; guard++) {
      const day = Math.min(sd, new Date(y, m, 0).getDate());
      const date = `${y}-${pad(m)}-${pad(day)}`;
      if (date > last) break;
      if (date >= from && date <= to) out.push({ ...base, date });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
