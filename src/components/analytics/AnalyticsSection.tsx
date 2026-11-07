import { getPlanFeatures } from "@/lib/planFeatures";
import {
  getProfitLossData,
  getExpenseBreakdownData,
  getSalesVsPurchasesData,
  getOutstandingCollectedData,
  getTopProductsData,
  getInvoiceStatusData,
} from "@/lib/analyticsData";
import { AnalyticsUpgradeCard } from "@/components/analytics/AnalyticsUpgradeCard";
import { AnalyticsSettingsPanel } from "@/components/analytics/AnalyticsSettingsPanel";
import { ProfitLossChart } from "@/components/analytics/ProfitLossChart";
import { ExpenseBreakdownChart } from "@/components/analytics/ExpenseBreakdownChart";
import { SalesVsPurchasesChart } from "@/components/analytics/SalesVsPurchasesChart";
import { OutstandingCollectedChart } from "@/components/analytics/OutstandingCollectedChart";
import { TopProductsChart } from "@/components/analytics/TopProductsChart";
import { InvoiceStatusChart } from "@/components/analytics/InvoiceStatusChart";
import { DEFAULT_ANALYTICS_PREFERENCES } from "@/types/database";
import type { AnalyticsPreferences, Plan } from "@/types/database";

/**
 * The whole Analytics/Overview section for the dashboard. Plan-gated at
 * this single entry point — a Basic plan never reaches the data
 * queries at all (the upgrade card is returned before any of
 * analyticsData.ts's functions are called), so this is a real access
 * boundary, not just a hidden UI section a Basic user's browser still
 * happens to receive the data for.
 */
export async function AnalyticsSection({
  plan,
  businessId,
  preferences,
}: {
  plan: Plan;
  businessId: string;
  preferences: AnalyticsPreferences | null | undefined;
}) {
  if (!getPlanFeatures(plan).profitAndLoss) {
    return <AnalyticsUpgradeCard />;
  }

  const prefs = preferences ?? DEFAULT_ANALYTICS_PREFERENCES;
  const { visibleCharts, chartTypes, dateRange } = prefs;

  // Only fetch data for charts the user actually has visible — avoids
  // running all 6 (some of which touch invoice_items, the heavier one)
  // when someone has hidden most of the section via customization.
  const [profitLoss, expenseBreakdown, salesVsPurchases, outstandingCollected, topProducts, invoiceStatus] =
    await Promise.all([
      visibleCharts.includes("profitLoss") ? getProfitLossData(businessId, dateRange) : Promise.resolve(null),
      visibleCharts.includes("expenseBreakdown") ? getExpenseBreakdownData(businessId, dateRange) : Promise.resolve(null),
      visibleCharts.includes("salesVsPurchases") ? getSalesVsPurchasesData(businessId, dateRange) : Promise.resolve(null),
      visibleCharts.includes("outstandingCollected") ? getOutstandingCollectedData(businessId, dateRange) : Promise.resolve(null),
      visibleCharts.includes("topProducts") ? getTopProductsData(businessId, dateRange, 5) : Promise.resolve(null),
      visibleCharts.includes("invoiceStatus") ? getInvoiceStatusData(businessId, dateRange) : Promise.resolve(null),
    ]);

  const hasAnyVisible = visibleCharts.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-text">Analytics</h2>
          <p className="text-xs text-text-soft">An overview of your business performance</p>
        </div>
        <AnalyticsSettingsPanel preferences={prefs} />
      </div>

      {!hasAnyVisible ? (
        <div className="rounded-xl2 border border-dashed border-paper-fold bg-paper-card p-8 text-center">
          <p className="text-sm text-text-soft">
            All charts are hidden. Use the settings icon above to show some.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {profitLoss && (
            <div className="lg:col-span-2">
              <ProfitLossChart
                data={profitLoss}
                chartType={chartTypes.profitLoss === "bar" ? "bar" : "line"}
              />
            </div>
          )}
          {salesVsPurchases && <SalesVsPurchasesChart data={salesVsPurchases} />}
          {outstandingCollected && <OutstandingCollectedChart data={outstandingCollected} />}
          {expenseBreakdown && <ExpenseBreakdownChart data={expenseBreakdown} />}
          {invoiceStatus && <InvoiceStatusChart data={invoiceStatus} />}
          {topProducts && (
            <div className="lg:col-span-2">
              <TopProductsChart data={topProducts} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
