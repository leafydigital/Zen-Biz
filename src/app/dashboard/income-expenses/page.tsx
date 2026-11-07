import { createClient } from "@/lib/supabase/server";
import { LockedFeature } from "@/components/LockedFeature";
import { getPlanFeatures } from "@/lib/planFeatures";
import { getCurrentProfile } from "@/lib/getCurrentProfile";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { getAuthUser } from "@/lib/getAuthUser";
import { getPeriod } from "@/lib/getPeriod";
import { periodFrom, periodTo } from "@/lib/period";
import { expandCashEntries, type CashEntry } from "@/lib/cashEntries";
import { IncomeExpenses } from "@/components/IncomeExpenses";

export default async function IncomeExpensesPage() {
  const profile = await getCurrentProfile();
  if (!getPlanFeatures(profile?.plan ?? "starter").expenseTracking) {
    return (
      <LockedFeature
        title="Income & Expenses is a Pro plan feature"
        description="Track salary, petrol, rent and other expenses, plus outside income, and see them in your Profit & Loss — available on the Pro plan."
        requiredPlan="professional"
      />
    );
  }

  const supabase = createClient();
  const user = await getAuthUser();
  const business = await getActiveBusiness();
  const period = getPeriod();

  const res = (await supabase
    .from("cash_entries" as never)
    .select("*")
    .eq("business_id", business?.id ?? "")) as { data: CashEntry[] | null; error: unknown };

  const rows = expandCashEntries(res.data ?? [], periodFrom(period), periodTo(period));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Income &amp; Expenses</h1>
        <p className="text-sm text-text-soft">
          Salary, petrol, rent and other costs, plus income from outside — add once, or repeat every month. Showing {period.label}.
        </p>
      </div>
      <IncomeExpenses
        rows={rows}
        ownerId={user!.id}
        businessId={business?.id ?? ""}
        currency={business?.default_currency ?? "INR"}
        periodLabel={period.label}
        missingTable={!!res.error}
      />
    </div>
  );
}
