export type CustomerRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  businesses: { name: string; phone: string }[];
  plan: "starter" | "professional" | "business";
  cycle: "monthly" | "yearly" | null;
  renewsAt: string | null;
  joined: string | null;
  remindOn: string | null;
  note: string | null;
};

export const MS_DAY = 86_400_000;

/** Whole days from today until the date (negative = already expired). */
export function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  const today = new Date();
  end.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / MS_DAY);
}

export function waNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}

/** Paid customers whose plan has run out, or runs out within `alertDays`, or whose own follow-up date has come. */
export function dueCustomers(rows: CustomerRow[], alertDays: number) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return rows.filter((r) => {
    if (r.plan === "starter") return false;
    const d = daysLeft(r.renewsAt);
    const expiring = d !== null && d <= alertDays;
    const followUp = !!r.remindOn && r.remindOn <= todayStr;
    return expiring || followUp;
  });
}
