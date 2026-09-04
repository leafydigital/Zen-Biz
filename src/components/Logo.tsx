export function Logo({
  className = "",
  variant = "dark",
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="28" height="28" rx="7" fill={variant === "light" ? "#FFFFFF" : "#2563EB"} />
        <path
          d="M8 10.5H22M22 10.5L9 19.5M22 10.5V8M9 19.5H22M9 19.5V22"
          stroke={variant === "light" ? "#2563EB" : "#F8FAFC"}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="15" cy="15" r="1.4" fill={variant === "light" ? "#7C3AED" : "#7C3AED"} />
      </svg>
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
