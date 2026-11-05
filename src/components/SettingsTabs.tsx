"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BusinessRole, Business, Plan, Profile } from "@/types/database";
import { EmailConnectionForm } from "@/components/EmailConnectionForm";
import { SettingsForm } from "@/components/SettingsForm";
import { DocumentDesignForm } from "@/components/DocumentDesignForm";
import { TermsForm } from "@/components/TermsForm";
import { BankDetailsForm } from "@/components/BankDetailsForm";
import { PlanBillingTab } from "@/components/PlanBillingTab";
import { BusinessManagementTab } from "@/components/BusinessManagementTab";
import { ActivityLogTab } from "@/components/ActivityLogTab";
import { TeamManagementTab } from "@/components/TeamManagementTab";
import { FormatSettingsForm } from "@/components/FormatSettingsForm";
import { BarcodeSettingsForm } from "@/components/BarcodeSettingsForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { settingsLevel, type SettingsLevel, type SettingsSectionKey } from "@/lib/permissions";
import { useTranslation } from "@/lib/i18n/I18nContext";
import type { BusinessRoleRow } from "@/lib/getBusinessRoles";
import type { BusinessMemberWithEmail } from "@/lib/getActiveBusiness";

type Tab = "general" | "businesses" | "team" | "appearance" | "terms" | "bank" | "format" | "barcode" | "plan" | "security" | "log";

export function SettingsTabs({
  profile,
  business,
  businesses,
  members,
  currentUserId,
  roles,
  permissions,
  isFullAccess,
  canViewLog,
  canDeleteLog,
}: {
  profile: Profile;
  business: Business;
  businesses: (Business & { role: BusinessRole })[];
  members: BusinessMemberWithEmail[];
  currentUserId: string;
  roles: BusinessRoleRow[];
  permissions: string[];
  isFullAccess: boolean;
  canViewLog: boolean;
  canDeleteLog: boolean;
}) {
  const { t } = useTranslation();
  const TABS: { id: Tab; label: string }[] = [
    { id: "general", label: t.settings.general },
    { id: "businesses", label: "Businesses" },
    { id: "team", label: "Team" },
    { id: "appearance", label: t.settings.documentAppearance },
    { id: "terms", label: t.settings.termsConditions },
    { id: "bank", label: t.settings.bankPayment },
    { id: "format", label: "Formats" },
    { id: "barcode", label: "Barcode" },
    { id: "plan", label: t.settings.planBilling },
    { id: "security", label: "Security" },
    { id: "log", label: "Activity log" },
  ];
  // Owner/admin see every tab. Others see only the settings sections their
  // role ticks (view or edit), plus Security so everyone can change their
  // own password.
  const sectionTab: Record<string, SettingsSectionKey> = {
    general: "general",
    appearance: "appearance",
    terms: "terms",
    bank: "bank",
    format: "format",
    barcode: "format",
  };
  const levelFor = (id: Tab): SettingsLevel =>
    isFullAccess ? "edit" : sectionTab[id] ? settingsLevel(permissions, sectionTab[id]) : null;
  const VISIBLE: Tab[] = isFullAccess
    ? ["general", "businesses", "team", "appearance", "terms", "bank", "format", "barcode", "plan", "security"]
    : [...(["general", "appearance", "terms", "bank", "format", "barcode"] as Tab[]).filter((id) => levelFor(id)), "security"];
  // Activity log: owner, or someone the owner ticked it for in Team.
  if (canViewLog) VISIBLE.push("log");
  const VISIBLE_TABS = TABS.filter((x) => VISIBLE.includes(x.id));
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "general";
  const [tab, setTab] = useState<Tab>(
    VISIBLE_TABS.some((tabDef) => tabDef.id === initialTab) ? initialTab : VISIBLE_TABS[0].id
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-paper-card p-1 shadow-card">
        {VISIBLE_TABS.map((t) => (
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

      <div className={`${tab === "appearance" || tab === "bank" || tab === "barcode" ? "max-w-6xl" : "max-w-3xl"} rounded-xl2 border border-paper-fold bg-paper-card p-6 shadow-card`}>
        {levelFor(tab) === "view" && !isFullAccess && (
          <p className="mb-4 rounded-lg bg-brass/10 px-3.5 py-2.5 text-sm text-brass-dark">
            View only — you can see these details but not change them.
          </p>
        )}
        <fieldset key={business.id} disabled={levelFor(tab) === "view" && !isFullAccess} className="min-w-0 border-0 p-0">
        {tab === "general" && (
          <>
            <SettingsForm profile={profile} business={business} />
            <EmailConnectionForm businessId={business.id} />
          </>
        )}
        {tab === "businesses" && (
          <BusinessManagementTab businesses={businesses} activeBusinessId={business.id} plan={profile.plan} />
        )}
        {tab === "team" && (
          <TeamManagementTab
            businessId={business.id}
            members={members}
            currentUserId={currentUserId}
            isOwner={businesses.find((b) => b.id === business.id)?.role === "owner"}
            canManage={["owner", "admin"].includes(businesses.find((b) => b.id === business.id)?.role ?? "")}
            plan={profile.plan}
            roles={roles}
            ownerBusinesses={businesses.filter((b) => b.owner_id === currentUserId)}
          />
        )}
        {tab === "appearance" && <DocumentDesignForm business={business} plan={profile.plan} />}
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
              business={business}
              docType="invoice"
              title="Invoice terms"
              placeholder={`e.g. Payment due within 15 days.\nGoods once sold will not be taken back.`}
            />
            <TermsForm
              business={business}
              docType="quotation"
              title="Quotation terms"
              placeholder={`e.g. This quotation is valid for 30 days.\nPrices subject to change without notice.`}
            />
            <TermsForm
              business={business}
              docType="purchase"
              title="Purchase terms"
              placeholder={`e.g. Goods must be delivered within 7 days.\nPayment on delivery.`}
            />
          </div>
        )}
        {tab === "bank" && <BankDetailsForm business={business} plan={profile.plan} />}
        {tab === "format" && <FormatSettingsForm business={business} />}
        {tab === "barcode" && <BarcodeSettingsForm business={business} />}
        {tab === "plan" && <PlanBillingTab profile={profile} />}
        </fieldset>
        {tab === "security" && <ChangePasswordForm />}
        {tab === "log" && canViewLog && (
          <ActivityLogTab
            isOwner={business.owner_id === currentUserId}
            canDelete={canDeleteLog}
            retentionDays={business.log_retention_days ?? null}
          />
        )}
      </div>
    </div>
  );
}
