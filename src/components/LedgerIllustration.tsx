export function LedgerIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="An open ledger book showing a sales chart, a customer list, and an invoice"
    >
      {/* Soft shadow under the book */}
      <ellipse cx="280" cy="410" rx="230" ry="18" fill="#0F3D3E" opacity="0.08" />

      {/* Book base */}
      <rect x="40" y="60" width="480" height="320" rx="14" fill="#FFFFFF" stroke="#E4E0D6" strokeWidth="2" />
      {/* Center fold shadow */}
      <rect x="278" y="60" width="4" height="320" fill="#0F3D3E" opacity="0.06" />

      {/* Left page: customer list */}
      <g>
        <text x="66" y="96" fontFamily="Georgia, serif" fontSize="17" fontWeight="600" fill="#0F3D3E">
          Customers
        </text>
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <circle cx="72" cy={128 + i * 34} r="9" fill={i % 2 === 0 ? "#C9A227" : "#0F3D3E"} opacity="0.85" />
            <rect x="92" y={122 + i * 34} width={120 - i * 6} height="7" rx="3.5" fill="#1A1A1A" opacity="0.75" />
            <rect x="92" y={133 + i * 34} width={80 - i * 4} height="5" rx="2.5" fill="#565248" opacity="0.4" />
          </g>
        ))}
      </g>

      {/* Right page: invoice + total */}
      <g>
        <text x="306" y="96" fontFamily="Georgia, serif" fontSize="17" fontWeight="600" fill="#0F3D3E">
          Invoice #0148
        </text>

        {[0, 1, 2].map((i) => (
          <g key={i}>
            <rect x="306" y={120 + i * 26} width="150" height="6" rx="3" fill="#1A1A1A" opacity="0.55" />
            <rect x="470" y={120 + i * 26} width="46" height="6" rx="3" fill="#565248" opacity="0.5" />
          </g>
        ))}

        <line x1="306" y1="210" x2="516" y2="210" stroke="#E4E0D6" strokeWidth="2" />

        <text x="306" y="238" fontFamily="'JetBrains Mono', monospace" fontSize="13" fill="#565248">
          Total
        </text>
        <text x="516" y="238" textAnchor="end" fontFamily="'JetBrains Mono', monospace" fontSize="17" fontWeight="700" fill="#0F3D3E">
          ₹18,450
        </text>

        {/* Small bar chart representing sales trend */}
        <g transform="translate(306, 260)">
          {[38, 52, 34, 64, 48, 72].map((h, i) => (
            <rect
              key={i}
              x={i * 32}
              y={80 - h}
              width="18"
              height={h}
              rx="3"
              fill={i === 5 ? "#C9A227" : "#0F3D3E"}
              opacity={i === 5 ? 1 : 0.7}
            />
          ))}
        </g>

        <rect x="306" y="352" width="96" height="22" rx="7" fill="#2E6B4F" opacity="0.12" />
        <text x="322" y="367" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#2E6B4F">
          PAID
        </text>
      </g>

      {/* Stitched spine accent */}
      <g opacity="0.9">
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={i} x="279" y={70 + i * 22} width="2" height="10" fill="#C9A227" />
        ))}
      </g>
    </svg>
  );
}
