import type { ReactNode } from "react";

/** Shared icon-only action buttons. The `title` shows a tooltip on mouse hover
 * (website / PC app) and `aria-label` names it for screen readers. */
export const ICON_BTN =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm transition disabled:opacity-60";

const svgProps = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const DownloadIcon = () => (
  <svg {...svgProps}>
    <path d="M12 3v12M7 11l5 5 5-5M5 20h14" />
  </svg>
);
export const TrashIcon = () => (
  <svg {...svgProps}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
export const EditIcon = () => (
  <svg {...svgProps}>
    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
export const Spinner = () => (
  <svg {...svgProps} className="animate-spin">
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

export function IconLinkLabel({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
