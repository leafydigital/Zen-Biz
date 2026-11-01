import Link from "next/link";

/** Shown in place of a page the person's role can't open — they stay signed in. */
export function AccessDenied({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 rounded-xl2 border border-alert/30 bg-alert-bg px-6 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-alert" aria-hidden="true">
        !
      </span>
      <h1 className="font-display text-xl font-semibold text-alert">No access to this page</h1>
      <p className="text-sm text-text">
        You are not allowed to use or open this page. Please do not try to access it — ask the business owner if you need access.
      </p>
      <Link href={backHref} className="mt-1 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper hover:bg-ink-light">
        {backLabel}
      </Link>
    </div>
  );
}
