"use client";

import { useState } from "react";

const ITEMS = [
  ["Home", "/"],
  ["Demo", "#demo"],
  ["About", "#about"],
  ["Pricing", "#pricing"],
  ["Features", "#features"],
  ["FAQ", "#faq"],
  ["Download", "#download"],
] as const;

/** Three-line menu for phones (the top menu is hidden on small screens). */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink hover:bg-paper-fold"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {open && (
        <nav
          aria-label="Mobile"
          className="absolute inset-x-0 top-full border-b border-paper-fold bg-paper shadow-lg"
        >
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {ITEMS.map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base font-medium text-text hover:bg-paper-fold"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
