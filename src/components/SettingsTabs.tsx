"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Profile } from "@/types/database";
import { SettingsForm } from "@/components/SettingsForm";
import { DocumentDesignForm } from "@/components/DocumentDesignForm";
import { TermsForm } from "@/components/TermsForm";
import { BankDetailsForm } from "@/components/BankDetailsForm";
import { PlanBillingTab } from "@/components/PlanBillingTab";

type Tab = "general" | "appearance" | "terms" | "bank" | "plan";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Document appearance" },
  { id: "terms", label: "Terms & Conditions" },
  { id: "bank", label: "Bank & Payment" },
  { id: "plan", label: "Plan & Billing" },
];

export function SettingsTabs({ profile }: { profile: Profile }) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "general";
  const [tab, setTab] = useState<Tab>(
    TABS.some((t) => t.id === initialTab) ? initialTab : "general"
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-paper-card p-1 shadow-card">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-ink text-paper"
                : "text-text-soft hover:bg-ink/[0.05] hover:text-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-3xl rounded-xl2 border border-paper-fold bg-paper-card p-6 shadow-card">
        {tab === "general" && <SettingsForm profile={profile} />}
        {tab === "appearance" && <DocumentDesignForm profile={profile} />}
        {tab === "terms" && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-text">
                Terms & Conditions
              </h2>
              <p className="text-sm text-text-soft">
                Kept separate for each document type — set whatever wording
                makes sense for each.
              </p>
            </div>
            <TermsForm
              profile={profile}
              docType="invoice"
              title="Invoice terms"
              placeholder={`e.g. Payment due within 15 days.\nGoods once sold will not be taken back.`}
            />
            <TermsForm
              profile={profile}
              docType="quotation"
              title="Quotation terms"
              placeholder={`e.g. This quotation is valid for 30 days.\nPrices subject to change without notice.`}
            />
            <TermsForm
              profile={profile}
              docType="purchase"
              title="Purchase terms"
              placeholder={`e.g. Goods must be delivered within 7 days.\nPayment on delivery.`}
            />
          </div>
        )}
        {tab === "bank" && <BankDetailsForm profile={profile} />}
        {tab === "plan" && <PlanBillingTab profile={profile} />}
      </div>
    </div>
  );
}
