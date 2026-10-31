"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { switchActiveBusiness } from "@/lib/actions/businessActions";
import type { Business } from "@/types/database";
import { useGlobalLoader } from "@/lib/GlobalLoaderContext";

export function BusinessSwitcher({
  activeBusiness,
  businesses,
}: {
  activeBusiness: Business;
  businesses: Business[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();

  function handleSwitch(businessId: string) {
    if (businessId === activeBusiness.id) {
      setOpen(false);
      return;
    }

    showLoader("Switching business…");

    startTransition(async () => {
      try {
        const result = await switchActiveBusiness(businessId);

        // Safe check using optional chaining to prevent reading 'error' on undefined
        if (!result?.error) {
          setOpen(false);
          router.refresh();
        } else {
          console.error("Failed to switch business:", result.error);
        }
      } catch (err) {
        console.error("Unexpected error switching business:", err);
      } finally {
        hideLoader();
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg border-l border-paper-fold pl-3 text-left transition hover:opacity-80"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {activeBusiness.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeBusiness.logo_url}
            alt={activeBusiness.business_name || "Business logo"}
            className="h-8 w-8 shrink-0 rounded-full border border-paper-fold object-contain"
          />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold uppercase text-white">
            {(activeBusiness.business_name || "Z").charAt(0)}
          </div>
        )}
        <div className="hidden sm:block">
          <p className="text-sm font-semibold leading-tight text-text">
            {activeBusiness.business_name || "Your business"}
          </p>
          <p className="text-xs capitalize leading-tight text-text-soft">
            {activeBusiness.business_type}
          </p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="hidden shrink-0 text-text-soft sm:block"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl2 border border-paper-fold bg-white p-2 shadow-lg"
          >
            <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2">
              {activeBusiness.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeBusiness.logo_url}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full border border-paper-fold object-contain"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold uppercase text-white">
                  {(activeBusiness.business_name || "Z").charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {activeBusiness.business_name || "Your business"}
                </p>
                <p className="text-xs text-text-soft">Current business</p>
              </div>
            </div>

            <div className="my-2 border-t border-paper-fold" />

            <p className="px-2.5 pb-1 text-[0.68rem] font-semibold uppercase tracking-wide text-text-soft">
              Switch business
            </p>
            <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={pending}
                  onClick={() => handleSwitch(b.id)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-text transition hover:bg-paper disabled:opacity-60"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {b.id === activeBusiness.id && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-ink"
                        aria-hidden="true"
                      >
                        <path
                          d="M20 6 9 17l-5-5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {b.business_name || "Untitled business"}
                  </span>
                </button>
              ))}
            </div>

            <div className="my-2 border-t border-paper-fold" />

            <Link
              href="/dashboard/settings?tab=businesses"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-2.5 py-2 text-sm font-medium text-text transition hover:bg-paper"
            >
              Manage Businesses
            </Link>
          </div>
        </>
      )}
    </div>
  );
}