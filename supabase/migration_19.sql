-- =============================================================================
-- ZEN BIZ — MIGRATION 19 (Dashboard analytics chart preferences)
-- =============================================================================
-- Adds a jsonb column to profiles for the Dashboard Analytics section's
-- per-user customization (which charts are visible, chart type per chart,
-- selected date range). Scoped to the user, not the business, since this
-- is a personal viewing preference — matches how `language` is scoped in
-- this same table, for the same reasoning.
--
-- Safe to re-run.
-- =============================================================================

alter table public.profiles add column if not exists analytics_preferences jsonb not null default '{
  "visibleCharts": ["profitLoss", "expenseBreakdown", "salesVsPurchases", "outstandingCollected", "topProducts", "invoiceStatus"],
  "chartTypes": {"profitLoss": "line", "salesVsPurchases": "bar", "outstandingCollected": "bar"},
  "dateRange": "thisMonth"
}'::jsonb;
