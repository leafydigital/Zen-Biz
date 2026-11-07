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

export const ViewIcon = () => (
  <svg {...svgProps}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const PrintIcon = () => (
  <svg {...svgProps}>
    <path d="M7 9V3h10v6M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z" />
  </svg>
);
export const MailIcon = () => (
  <svg {...svgProps}>
    <path d="M4 6h16v12H4z" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);
export const WhatsAppIcon = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.1.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.4L9.7 7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1 0 1.2.9 2.4 1 2.6.1.2 1.8 2.8 4.4 3.9.6.3 1.1.4 1.5.6.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.4.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z" />
    <path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.5 5.1L2 22l5.1-1.3C8.5 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2Zm0 18.2c-1.7 0-3.2-.5-4.5-1.3l-.3-.2-3 .8.8-2.9-.2-.3C4 15 3.5 13.6 3.5 12c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5-3.8 8.5-8.5 8.5Z" />
  </svg>
);
