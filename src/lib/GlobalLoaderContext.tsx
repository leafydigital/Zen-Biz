"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";

interface GlobalLoaderContextValue {
  /** Shows the modal loader. Safe to call multiple times while already
   * showing (e.g. two actions overlapping) — it stays visible until every
   * matching hide() has been called. */
  showLoader: (message?: string) => void;
  hideLoader: () => void;
}

const GlobalLoaderContext = createContext<GlobalLoaderContextValue | null>(null);

export function useGlobalLoader() {
  const ctx = useContext(GlobalLoaderContext);
  if (!ctx) {
    throw new Error("useGlobalLoader must be used within GlobalLoaderProvider");
  }
  return ctx;
}

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  // Counts overlapping show/hide calls so one action finishing early
  // doesn't hide the loader out from under a second, still-running one.
  const countRef = useRef(0);

  const showLoader = useCallback((msg?: string) => {
    countRef.current += 1;
    setMessage(msg);
    setVisible(true);
  }, []);

  const hideLoader = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) {
      setVisible(false);
      setMessage(undefined);
    }
  }, []);

  return (
    <GlobalLoaderContext.Provider value={{ showLoader, hideLoader }}>
      {children}
      {visible && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/30 backdrop-blur-[2px]"
          role="status"
          aria-live="polite"
          aria-label={message ?? "Loading"}
        >
          <div className="flex flex-col items-center gap-3 rounded-xl2 bg-white px-8 py-7 shadow-lg">
            <svg className="h-8 w-8 animate-spin text-ink" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <p className="text-sm font-medium text-text">{message ?? "Please wait…"}</p>
          </div>
        </div>
      )}
    </GlobalLoaderContext.Provider>
  );
}
