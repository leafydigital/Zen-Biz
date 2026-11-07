"use client";

import { useEffect, useState } from "react";
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
import { UpdatesTab } from "@/components/UpdatesTab";
import { FormatSettingsForm } from "@/components/FormatSettingsForm";
import { BarcodeSettingsForm } from "@/components/BarcodeSettingsForm";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { settingsLevel, type SettingsLevel, type SettingsSectionKey } from "@/lib/permissions";
import { useTranslation } from "@/lib/i18n/I18nContext";
import type { BusinessRoleRow } from "@/lib/getBusinessRoles";
import type { BusinessMemberWithEmail } from "@/lib/getActiveBusiness";

type Tab = "general" | "businesses" | "team" | "appearance" | "terms" | "bank" | "format" | "barcode" | "plan" | "security" | "updates" | "log";

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
    { id: "businesses", label: t.settings.businesses },
    { id: "team", label: t.settings.team },
    { id: "appearance", label: t.settings.documentAppearance },
    { id: "terms", label: t.settings.termsConditions },
    { id: "bank", label: t.settings.bankPayment },
    { id: "format", label: t.settings.formats },
    { id: "barcode", label: t.settings.barcode },
    { id: "plan", label: t.settings.planBilling },
    { id: "security", label: t.settings.security },
    { id: "updates", label: "Updates" },
    { id: "log", label: t.settings.activityLog },
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
    ? ["general", "businesses", "team", "appearance", "terms", "bank", "format", "barcode", "plan", "security", "updates"]
    : [...(["general", "appearance", "terms", "bank", "format", "barcode"] as Tab[]).filter((id) => levelFor(id)), "security", "updates"];
  // Activity log: owner, or someone the owner ticked it for in Team.
  if (canViewLog) VISIBLE.push("log");
  const VISIBLE_TABS = TABS.filter((x) => VISIBLE.includes(x.id));
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "general";
  // Only inside the Android app: tabs become a slide-in side menu. The website keeps the top tabs.
  const [isNative, setIsNative] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setIsNative(Boolean((window as any).Capacitor?.isNativePlatform?.())); // eslint-disable-line @typescript-eslint/no-explicit-any
  }, []);
  const [tab, setTab] = useState<Tab>(
    VISIBLE_TABS.some((tabDef) => tabDef.id === initialTab) ? initialTab : VISIBLE_TABS[0].id
  );

  return (
    <div className="flex flex-col gap-5">
      {isNative && (
        <>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open settings menu"
            className="flex items-center gap-3 rounded-xl bg-paper-card px-4 py-3 text-left text-sm font-semibold text-text shadow-card"
          >
            <span className="flex-1">{VISIBLE_TABS.find((x) => x.id === tab)?.label}</span>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          {menuOpen && (
            <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
              <div className="absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} />
              <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col gap-1 overflow-y-auto bg-paper-card p-4 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-base font-semibold text-text">Settings</span>
                  <button onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-1 text-sm text-text-soft">
                    Close
                  </button>
                </div>
                {VISIBLE_TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(t.id);
                      setMenuOpen(false);
                    }}
                    className={`rounded-xl px-3.5 py-3 text-left text-sm font-medium transition ${
                      tab === t.id ? "bg-ink text-paper" : "text-text hover:bg-ink/[0.05]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <div className={`${isNative ? "hidden" : "flex"} gap-1 overflow-x-auto rounded-xl bg-paper-card p-1 shadow-card`}>
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
            {t.settings.viewOnly}
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
        {tab === "updates" && <UpdatesTab />}
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
