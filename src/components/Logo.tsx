export function Logo({
  className = "",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" width={34} height={34} alt="" aria-hidden="true" className="h-[34px] w-[34px] rounded-lg object-cover" />
      <span
        className={`font-display text-[1.25rem] font-semibold tracking-tight ${
          variant === "light" ? "text-white" : "text-ink"
        }`}
      >
        Zen Biz
      </span>
    </div>
  );
}
