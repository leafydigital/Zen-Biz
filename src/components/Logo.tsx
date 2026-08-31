export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="28" height="28" rx="7" fill="#0F3D3E" />
        <path
          d="M8 10.5H22M22 10.5L9 19.5M22 10.5V8M9 19.5H22M9 19.5V22"
          stroke="#F7F5F0"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="15" cy="15" r="1.4" fill="#C9A227" />
      </svg>
      <span className="font-display text-[1.25rem] font-semibold tracking-tight text-ink">
        Zen Biz
      </span>
    </div>
  );
}
