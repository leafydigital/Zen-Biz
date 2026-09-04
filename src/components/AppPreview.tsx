export function AppPreview({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 460"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Zen Biz dashboard showing business stats, a customer list, and an invoice"
    >
      <ellipse cx="320" cy="438" rx="260" ry="14" fill="#2563EB" opacity="0.08" />

      {/* Browser frame */}
      <rect x="20" y="20" width="600" height="410" rx="14" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="2" />
      {/* Browser chrome bar */}
      <rect x="20" y="20" width="600" height="34" rx="14" fill="#F8FAFC" />
      <rect x="20" y="42" width="600" height="12" fill="#F8FAFC" />
      <circle cx="40" cy="37" r="4.5" fill="#E2E8F0" />
      <circle cx="56" cy="37" r="4.5" fill="#E2E8F0" />
      <circle cx="72" cy="37" r="4.5" fill="#E2E8F0" />
      <rect x="96" y="30" width="220" height="14" rx="7" fill="#FFFFFF" stroke="#E2E8F0" />
      <text x="106" y="40" fontFamily="Inter, sans-serif" fontSize="8.5" fill="#64748B">
        zenbiz.app/dashboard
      </text>

      {/* Sidebar */}
      <rect x="20" y="54" width="128" height="376" fill="#FFFFFF" />
      <line x1="148" y1="54" x2="148" y2="430" stroke="#E2E8F0" strokeWidth="2" />

      {/* Sidebar logo */}
      <rect x="38" y="70" width="16" height="16" rx="4" fill="#2563EB" />
      <text x="60" y="82" fontFamily="Georgia, serif" fontSize="12" fontWeight="700" fill="#2563EB">
        Zen Biz
      </text>

      {/* Sidebar nav items */}
      <g>
        <rect x="34" y="106" width="106" height="26" rx="7" fill="#2563EB" opacity="0.07" />
        <rect x="35" y="115" width="3" height="8" rx="1.5" fill="#7C3AED" />
        <text x="48" y="123" fontFamily="Inter, sans-serif" fontSize="9.5" fontWeight="600" fill="#2563EB">
          Overview
        </text>

        {["Products", "Customers", "Invoices", "Settings"].map((label, i) => (
          <text
            key={label}
            x="48"
            y={123 + (i + 1) * 30}
            fontFamily="Inter, sans-serif"
            fontSize="9.5"
            fill="#64748B"
          >
            {label}
          </text>
        ))}
      </g>

      {/* Main content area background */}
      <rect x="148" y="54" width="472" height="376" fill="#F8FAFC" />

      {/* Greeting */}
      <text x="172" y="90" fontFamily="Georgia, serif" fontSize="15" fontWeight="700" fill="#172554">
        Good to see you, Sunrise Traders
      </text>
      <text x="172" y="106" fontFamily="Inter, sans-serif" fontSize="8.5" fill="#64748B">
        Here's how your dashboard looks today.
      </text>

      {/* Stat cards */}
      {[
        { label: "Products", value: "42", x: 172 },
        { label: "Customers", value: "118", x: 300 },
        { label: "Collected", value: "₹86,400", x: 428 },
        { label: "Outstanding", value: "₹6,200", x: 172, row2: true },
      ].map((s, i) => (
        <g key={i}>
          <rect
            x={s.x}
            y={s.row2 ? 196 : 124}
            width="116"
            height="60"
            rx="10"
            fill="#FFFFFF"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />
          <text
            x={s.x + 14}
            y={s.row2 ? 216 : 144}
            fontFamily="Inter, sans-serif"
            fontSize="7.5"
            fontWeight="600"
            fill="#64748B"
            letterSpacing="0.5"
          >
            {s.label.toUpperCase()}
          </text>
          <text
            x={s.x + 14}
            y={s.row2 ? 240 : 168}
            fontFamily="'JetBrains Mono', monospace"
            fontSize="15"
            fontWeight="700"
            fill="#2563EB"
          >
            {s.value}
          </text>
        </g>
      ))}

      {/* Recent invoices card */}
      <rect x="300" y="196" width="244" height="60" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
      <text x="314" y="214" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" fill="#172554">
        Recent invoices
      </text>
      {[
        { num: "INV-0148", amt: "₹4,200", status: "Paid" },
        { num: "INV-0147", amt: "₹1,850", status: "Unpaid" },
      ].map((inv, i) => (
        <g key={inv.num}>
          <text x="314" y={230 + i * 13} fontFamily="Inter, sans-serif" fontSize="8" fill="#64748B">
            {inv.num}
          </text>
          <rect
            x="470"
            y={224 + i * 13}
            width="40"
            height="12"
            rx="6"
            fill={inv.status === "Paid" ? "#10B981" : "#7C3AED"}
            opacity="0.14"
          />
          <text
            x="490"
            y={233 + i * 13}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="6.5"
            fontWeight="700"
            fill={inv.status === "Paid" ? "#10B981" : "#5B21B6"}
          >
            {inv.status.toUpperCase()}
          </text>
        </g>
      ))}

      {/* Customers table */}
      <rect x="172" y="272" width="372" height="134" rx="10" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
      <text x="188" y="294" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="700" fill="#172554">
        Customers
      </text>
      <rect x="480" y="284" width="52" height="16" rx="6" fill="#2563EB" />
      <text x="506" y="295" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7" fontWeight="600" fill="#F8FAFC">
        + Add
      </text>

      <line x1="188" y1="308" x2="528" y2="308" stroke="#E2E8F0" />

      {["Meera Nair", "Arjun Patel", "Kavya Rao"].map((name, i) => (
        <g key={name}>
          <circle cx="198" cy={328 + i * 24} r="8" fill={i % 2 === 0 ? "#7C3AED" : "#2563EB"} opacity="0.8" />
          <text x="214" y={332 + i * 24} fontFamily="Inter, sans-serif" fontSize="8.5" fill="#172554">
            {name}
          </text>
          <text x="480" y={332 + i * 24} fontFamily="Inter, sans-serif" fontSize="7.5" fill="#64748B">
            +91 9•• •••• ••
          </text>
        </g>
      ))}
    </svg>
  );
}
