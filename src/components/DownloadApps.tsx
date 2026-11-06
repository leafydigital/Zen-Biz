const RELEASE = "https://github.com/leafydigital/Zen-Biz/releases/download/downloads";

const OPTIONS = [
  {
    name: "Android",
    note: "Install the app on your phone (.apk)",
    cta: "Download APK",
    href: `${RELEASE}/ZenBiz.apk`,
    download: true,
    icon: (
      <path d="M7 9h10v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9Zm0 0a5 5 0 0 1 10 0M9.5 6 8.3 4.2M14.5 6l1.2-1.8M4.5 10v5M19.5 10v5M10 18v3M14 18v3" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    name: "Website",
    note: "Use it right in your browser, nothing to install",
    cta: "Open site",
    href: "/login",
    download: false,
    icon: (
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    name: "Windows",
    note: "Install on your PC like normal software (.exe)",
    cta: "Download .exe",
    href: `${RELEASE}/ZenBiz-Setup.exe`,
    download: true,
    icon: (
      <path d="M3.5 5.5 11 4.4v7H3.5v-5.9Zm8.9-1.2L20.5 3v8.4h-8.1V4.3ZM3.5 12.6H11v7l-7.5-1.1v-5.9Zm8.9 0h8.1V21l-8.1-1.2v-7.2Z" strokeWidth="1.5" strokeLinejoin="round" />
    ),
  },
];

export function DownloadApps() {
  return (
    <section id="download" className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h2 className="font-display text-2xl font-semibold text-text sm:text-3xl">Get Zen Biz on your device</h2>
        <p className="mt-2 text-sm text-text-soft">Same account everywhere. Updates reach every device automatically.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((o) => (
          <div key={o.name} className="flex flex-col items-center rounded-2xl border border-paper-fold bg-paper-card p-6 text-center">
            <svg viewBox="0 0 24 24" className="h-10 w-10 text-ink" fill="none" stroke="currentColor" aria-hidden="true">
              {o.icon}
            </svg>
            <h3 className="mt-3 font-display text-lg font-semibold text-text">{o.name}</h3>
            <p className="mt-1 flex-1 text-sm text-text-soft">{o.note}</p>
            <a
              href={o.href}
              {...(o.download ? { download: true } : {})}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {o.cta}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
