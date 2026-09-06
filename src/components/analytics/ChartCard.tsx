export function ChartCard({
  title,
  subtitle,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  subtitle?: string;
  isEmpty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl2 border border-paper-fold bg-white p-4 shadow-card sm:p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {subtitle && <p className="text-xs text-text-soft">{subtitle}</p>}
      </div>
      {isEmpty ? (
        <div className="flex h-[220px] flex-col items-center justify-center gap-1 text-center">
          <p className="text-sm text-text-soft">
            {emptyMessage ?? "No data yet for this period."}
          </p>
        </div>
      ) : (
        <div className="min-w-0">{children}</div>
      )}
    </div>
  );
}

/** Shown in place of a chart while its data is loading — a plain
 * skeleton with no chart-library dependency, so it renders instantly. */
export function ChartSkeleton() {
  return (
    <div className="flex h-[220px] w-full animate-pulse flex-col justify-end gap-2 px-2">
      <div className="flex h-full items-end gap-2">
        {[40, 65, 50, 80, 55, 70, 45].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-paper-fold"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="h-px w-full bg-paper-fold" />
    </div>
  );
}
