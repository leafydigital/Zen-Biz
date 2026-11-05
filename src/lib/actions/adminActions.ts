"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { canEdit, canView, checkConsoleLogin, endAdminSession, getConsoleSession, hashPassword, startAdminSession } from "@/lib/adminAuth";
import { cleanPerms, allEdit, type SectionId } from "@/lib/consoleSections";
import type { CustomerRow } from "@/lib/customerTypes";
import { passwordIssue } from "@/lib/passwordValidation";
import { computeDiscount } from "@/lib/discounts";
import { getAppConfig } from "@/lib/getAppConfig";
import { encryptSecret, decryptSecret } from "@/lib/emailCrypto";
import Razorpay from "razorpay";

const attempts = new Map<string, { n: number; first: number }>();

export async function adminLogin(_prev: { error: string | null }, formData: FormData): Promise<{ error: string | null }> {
  const ip = headers().get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rec = attempts.get(ip);
  if (rec && Date.now() - rec.first < 15 * 60_000 && rec.n >= 5) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }
  const ok = await checkConsoleLogin(String(formData.get("username") ?? ""), String(formData.get("password") ?? ""));
  if (!ok) {
    const fresh = !rec || Date.now() - rec.first >= 15 * 60_000;
    attempts.set(ip, { n: fresh ? 1 : rec!.n + 1, first: fresh ? Date.now() : rec!.first });
    return { error: "Wrong username or password." };
  }
  attempts.delete(ip);
  startAdminSession(ok.id);
  redirect("/app");
}

export async function adminLogout() {
  endAdminSession();
  redirect("/app");
}

/** null when the signed-in console user may EDIT this section. */
async function guard(sec: SectionId) {
  const s = await getConsoleSession();
  if (!s) return "Not signed in.";
  return canEdit(s, sec) ? null : "You only have view access to this section.";
}

/** Tickets: editing either Problems raised or Enquiries is enough. */
async function guardTicket() {
  const s = await getConsoleSession();
  if (!s) return "Not signed in.";
  return canEdit(s, "issues") || canEdit(s, "enquiries") ? null : "You only have view access to tickets.";
}

async function saveSetting(key: string, value: unknown) {
  const { error } = await createAdminClient()
    .from("app_settings" as never)
    .upsert({ key, value, updated_at: new Date().toISOString() } as never);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { error: null };
}

export async function saveVersion(version: string) {
  const g = await guard("settings");
  if (g) return { error: g };
  const v = version.trim();
  if (!v || v.length > 20) return { error: "Enter a version (up to 20 characters)." };
  return saveSetting("version", v);
}

export async function saveContact(c: {
  email: string;
  whatsapp: string;
  address: string;
  message: string;
  days: string[];
  openTime: string;
  closeTime: string;
}) {
  const g = await guard("settings");
  if (g) return { error: g };
  const t = (v: unknown) => String(v ?? "").trim().slice(0, 500);
  const time = (v: unknown) => (/^\d{2}:\d{2}$/.test(String(v)) ? String(v) : "");
  const valid = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return saveSetting("contact", {
    email: t(c.email),
    whatsapp: t(c.whatsapp),
    address: t(c.address),
    message: t(c.message),
    days: (c.days ?? []).filter((d) => valid.includes(d)),
    openTime: time(c.openTime),
    closeTime: time(c.closeTime),
  });
}

export async function savePricing(p: Record<"professional" | "business", { monthly: number; yearly: number }>) {
  const g = await guard("pricing");
  if (g) return { error: g };
  for (const plan of ["professional", "business"] as const) {
    for (const cycle of ["monthly", "yearly"] as const) {
      const n = Number(p[plan]?.[cycle]);
      if (!Number.isFinite(n) || n < 1 || n > 1_000_000) return { error: "Enter valid prices (whole rupees)." };
      p[plan][cycle] = Math.round(n);
    }
  }
  return saveSetting("pricing", p);
}

export async function updateTicketStatus(id: string, status: "open" | "in_progress" | "resolved") {
  const g = await guardTicket();
  if (g) return { error: g };
  if (!["open", "in_progress", "resolved"].includes(status)) return { error: "Bad status." };
  const { error } = await createAdminClient().from("support_tickets" as never).update({ status } as never).eq("id", id);
  revalidatePath("/app");
  return { error: error?.message ?? null };
}

export async function deleteTicket(id: string) {
  const g = await guardTicket();
  if (g) return { error: g };
  const admin = createAdminClient();
  const { data } = (await admin.from("support_tickets" as never).select("screenshot_url").eq("id", id).maybeSingle()) as { data: { screenshot_url: string | null } | null };
  const path = data?.screenshot_url?.split("ticket-screenshots/")[1]?.split("?")[0];
  if (path) await admin.storage.from("ticket-screenshots").remove([decodeURIComponent(path)]);
  const { error } = await admin.from("support_tickets" as never).delete().eq("id", id);
  revalidatePath("/app");
  return { error: error?.message ?? null };
}

export async function createDiscount(input: {
  code: string;
  kind: "percent" | "flat";
  value: number;
  plans: string[];
  maxUses: number | null;
  expiresAt: string | null;
  note: string;
}) {
  const g = await guard("discounts");
  if (g) return { error: g };
  const value = Number(input.value);
  if (!(value > 0)) return { error: "Enter a discount value." };
  if (input.kind === "percent" && value > 100) return { error: "A percentage can't be more than 100." };
  if (input.expiresAt) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiresAt)) return { error: "Pick a valid expiry date." };
    const endOfDay = new Date(input.expiresAt + "T23:59:59+05:30");
    if (endOfDay.getTime() < Date.now()) return { error: "The expiry date is already past. Pick today or a later date." };
  }
  let code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  if (!code) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    code = "ZEN" + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  const { error } = await createAdminClient()
    .from("discount_codes" as never)
    .insert({
      code,
      kind: input.kind,
      value,
      plans: input.plans.length ? input.plans : null,
      max_uses: input.maxUses && input.maxUses > 0 ? Math.floor(input.maxUses) : null,
      expires_at: input.expiresAt ? new Date(input.expiresAt + "T23:59:59+05:30").toISOString() : null,
      note: input.note.trim() || null,
    } as never);
  if (error) return { error: error.message.includes("duplicate") ? "That code already exists." : error.message };
  revalidatePath("/app");
  return { error: null, code };
}

export async function toggleDiscount(id: string, active: boolean) {
  const g = await guard("discounts");
  if (g) return { error: g };
  const { error } = await createAdminClient().from("discount_codes" as never).update({ active } as never).eq("id", id);
  revalidatePath("/app");
  return { error: error?.message ?? null };
}

export async function deleteDiscount(id: string) {
  const g = await guard("discounts");
  if (g) return { error: g };
  const { error } = await createAdminClient().from("discount_codes" as never).delete().eq("id", id);
  revalidatePath("/app");
  return { error: error?.message ?? null };
}

/** For the checkout screen: shows what a code would take off the chosen plan. */
export async function checkDiscount(code: string, plan: "professional" | "business", cycle: "monthly" | "yearly") {
  const cfg = await getAppConfig();
  return computeDiscount(code, plan, cfg.pricing[plan][cycle]);
}

/** Fresh tickets for the auto-refresh — only the Problems/Enquiries lists call this. */
export async function getTickets() {
  const s = await getConsoleSession();
  if (!s || !(s.perms.issues !== "none" || s.perms.enquiries !== "none")) return { error: "Not signed in.", tickets: [] as any[] };
  const admin = createAdminClient();
  const { data, error } = await admin.from("support_tickets" as never).select("*").order("created_at", { ascending: false }).limit(300);
  if (error) return { error: error.message, tickets: [] as any[] };
  const tickets = await Promise.all(
    ((data ?? []) as any[]).map(async (t) => {
      let shot: string | null = null;
      if (t.screenshot_url) {
        const path = String(t.screenshot_url).split("ticket-screenshots/")[1]?.split("?")[0];
        if (path) {
          const { data: u } = await admin.storage.from("ticket-screenshots").createSignedUrl(decodeURIComponent(path), 3600);
          shot = u?.signedUrl ?? null;
        }
      }
      return { ...t, screenshot_signed: shot };
    })
  );
  return { error: null, tickets };
}

// ---------- console users & passwords ----------

const pwAttempts = new Map<string, { n: number; first: number }>();

/** A signed-in console user changes their OWN password. The current password must be typed correctly first. */
export async function changeMyPassword(currentPassword: string, newPassword: string) {
  const s = await getConsoleSession();
  if (!s) return { error: "Not signed in." };

  // Stops someone at an unlocked screen from guessing the current password.
  const rec = pwAttempts.get(s.username);
  if (rec && Date.now() - rec.first < 15 * 60_000 && rec.n >= 5) return { error: "Too many wrong attempts. Try again in 15 minutes." };
  const ok = await checkConsoleLogin(s.username, String(currentPassword ?? ""));
  if (!ok) {
    const fresh = !rec || Date.now() - rec.first >= 15 * 60_000;
    pwAttempts.set(s.username, { n: fresh ? 1 : rec!.n + 1, first: fresh ? Date.now() : rec!.first });
    return { error: "Current password is wrong. Your password was not changed." };
  }
  pwAttempts.delete(s.username);
  if (currentPassword === newPassword) return { error: "The new password must be different from the current one." };

  const issue = passwordIssue(newPassword);
  if (issue) return { error: issue };
  const admin = createAdminClient();
  const hash = hashPassword(newPassword);
  if (s.id === "env") {
    // The env owner gets a database row so the new password replaces the env one.
    const { data, error } = (await admin
      .from("console_users" as never)
      .upsert({ username: s.username.toLowerCase(), password_hash: hash, role_name: "Owner", permissions: allEdit(), is_super: true, active: true } as never, { onConflict: "username" })
      .select("id")
      .single()) as { data: { id: string } | null; error: { message: string } | null };
    if (error || !data) return { error: error?.message ?? "Could not save." };
    startAdminSession(data.id);
    return { error: null };
  }
  const { error } = await admin.from("console_users" as never).update({ password_hash: hash } as never).eq("id", s.id);
  return { error: error?.message ?? null };
}

async function superOnly() {
  const s = await getConsoleSession();
  if (!s) return { s: null, err: "Not signed in." };
  if (!s.isSuper) return { s: null, err: "Only the owner can manage users." };
  return { s, err: null as string | null };
}

export async function listConsoleUsers() {
  const { err } = await superOnly();
  if (err) return { error: err, users: [] as any[] };
  const { data, error } = await createAdminClient()
    .from("console_users" as never)
    .select("id, username, role_name, permissions, active, is_super, created_at")
    .eq("is_super", false)
    .order("created_at", { ascending: true });
  return { error: error?.message ?? null, users: (data ?? []) as any[] };
}

const validUsername = (u: string) => /^[A-Za-z0-9._@-]{3,40}$/.test(u);

export async function createConsoleUser(input: { username: string; password: string; role: string; permissions: unknown }) {
  const { err } = await superOnly();
  if (err) return { error: err };
  const username = input.username.trim().toLowerCase();
  if (!validUsername(username)) return { error: "Username: 3–40 letters, numbers or . _ @ -" };
  if (process.env.ADMIN_USERNAME && username === process.env.ADMIN_USERNAME.toLowerCase()) return { error: "That username is reserved." };
  const issue = passwordIssue(input.password);
  if (issue) return { error: issue };
  const { error } = await createAdminClient()
    .from("console_users" as never)
    .insert({
      username,
      password_hash: hashPassword(input.password),
      role_name: input.role.trim().slice(0, 40) || "Staff",
      permissions: cleanPerms(input.permissions),
    } as never);
  if (error) return { error: error.message.includes("duplicate") ? "That username already exists." : error.message };
  return { error: null };
}

export async function updateConsoleUser(id: string, input: { role: string; permissions: unknown; active: boolean }) {
  const { err } = await superOnly();
  if (err) return { error: err };
  const { error } = await createAdminClient()
    .from("console_users" as never)
    .update({ role_name: input.role.trim().slice(0, 40) || "Staff", permissions: cleanPerms(input.permissions), active: !!input.active } as never)
    .eq("id", id)
    .eq("is_super", false);
  return { error: error?.message ?? null };
}

export async function resetConsoleUserPassword(id: string, newPassword: string) {
  const { err } = await superOnly();
  if (err) return { error: err };
  const issue = passwordIssue(newPassword);
  if (issue) return { error: issue };
  const { error } = await createAdminClient()
    .from("console_users" as never)
    .update({ password_hash: hashPassword(newPassword) } as never)
    .eq("id", id)
    .eq("is_super", false);
  return { error: error?.message ?? null };
}

export async function deleteConsoleUser(id: string) {
  const { err } = await superOnly();
  if (err) return { error: err };
  const { error } = await createAdminClient().from("console_users" as never).delete().eq("id", id).eq("is_super", false);
  return { error: error?.message ?? null };
}

// ---------- customers & payment reminders ----------

export async function getCustomers(): Promise<{ error: string | null; rows: CustomerRow[]; alertDays: number }> {
  const s = await getConsoleSession();
  if (!s || !(canView(s, "customers") || canView(s, "renewals"))) return { error: "Not allowed.", rows: [], alertDays: 7 };
  const admin = createAdminClient();

  const users = new Map<string, { email: string; created: string | null }>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) users.set(u.id, { email: u.email ?? "", created: u.created_at ?? null });
    if (data.users.length < 1000) break;
  }

  const [profiles, businesses, followups, alert] = await Promise.all([
    admin.from("profiles" as never).select("id, plan, billing_cycle, plan_renews_at, phone, business_name, created_at"),
    admin.from("businesses" as never).select("owner_id, business_name, phone").order("created_at", { ascending: true }),
    admin.from("renewal_followups" as never).select("user_id, remind_on, note"),
    admin.from("app_settings" as never).select("value").eq("key", "renewal_alert_days").maybeSingle(),
  ]);
  if (profiles.error) return { error: profiles.error.message, rows: [], alertDays: 7 };

  const byOwner = new Map<string, { name: string; phone: string }[]>();
  for (const b of (businesses.data ?? []) as any[]) {
    const list = byOwner.get(b.owner_id) ?? [];
    list.push({ name: b.business_name ?? "", phone: b.phone ?? "" });
    byOwner.set(b.owner_id, list);
  }
  const fu = new Map<string, { remind_on: string | null; note: string | null }>();
  for (const f of (followups.data ?? []) as any[]) fu.set(f.user_id, f);

  const rows: CustomerRow[] = ((profiles.data ?? []) as any[]).map((p) => {
    const bs = byOwner.get(p.id) ?? [];
    const u = users.get(p.id);
    return {
      id: p.id,
      email: u?.email ?? "",
      name: bs[0]?.name || p.business_name || "(no business name)",
      phone: p.phone || bs.find((b) => b.phone)?.phone || "",
      businesses: bs,
      plan: p.plan,
      cycle: p.billing_cycle,
      renewsAt: p.plan_renews_at,
      joined: u?.created ?? p.created_at ?? null,
      remindOn: fu.get(p.id)?.remind_on ?? null,
      note: fu.get(p.id)?.note ?? null,
    };
  });
  rows.sort((a, b) => String(b.joined).localeCompare(String(a.joined)));
  const days = Number((alert.data as any)?.value);
  return { error: null, rows, alertDays: Number.isFinite(days) && days > 0 ? days : 7 };
}

export async function saveAlertDays(days: number) {
  const g = await guard("renewals");
  if (g) return { error: g };
  const n = Math.round(Number(days));
  if (!(n >= 1 && n <= 365)) return { error: "Enter 1 to 365 days." };
  return saveSetting("renewal_alert_days", n);
}

export async function saveFollowup(userId: string, remindOn: string | null, note: string) {
  const g = await guard("renewals");
  if (g) return { error: g };
  if (remindOn && !/^\d{4}-\d{2}-\d{2}$/.test(remindOn)) return { error: "Pick a valid date." };
  const { error } = await createAdminClient()
    .from("renewal_followups" as never)
    .upsert({ user_id: userId, remind_on: remindOn || null, note: note.trim().slice(0, 300) || null, updated_at: new Date().toISOString() } as never);
  return { error: error?.message ?? null };
}

/** Manual plan change (e.g. an offline payment): sets plan, billing cycle and expiry date. */
export async function setCustomerPlan(userId: string, plan: string, cycle: string | null, renewsAt: string | null) {
  const g = await guard("customers");
  if (g) return { error: g };
  if (!["starter", "professional", "business"].includes(plan)) return { error: "Pick a plan." };
  const paid = plan !== "starter";
  if (paid && cycle && !["monthly", "yearly"].includes(cycle)) return { error: "Pick monthly or yearly." };
  if (renewsAt && !/^\d{4}-\d{2}-\d{2}$/.test(renewsAt)) return { error: "Pick a valid expiry date." };
  const { error } = await createAdminClient()
    .from("profiles" as never)
    .update({
      plan,
      billing_cycle: paid ? cycle || null : null,
      plan_renews_at: paid && renewsAt ? new Date(renewsAt + "T23:59:59+05:30").toISOString() : null,
    } as never)
    .eq("id", userId);
  return { error: error?.message ?? null };
}

// ── Payments: the Razorpay account plan payments are collected into ─────────

type GatewayRow = { key_id: string | null; key_secret_enc: string | null; webhook_secret_enc: string | null; enabled: boolean };

async function gatewayRow(): Promise<GatewayRow | null> {
  const { data } = (await createAdminClient()
    .from("payment_gateway" as never)
    .select("key_id, key_secret_enc, webhook_secret_enc, enabled")
    .eq("provider", "razorpay")
    .maybeSingle()) as { data: GatewayRow | null };
  return data;
}

/** Never returns the secrets, only whether they are saved. */
export async function getPaymentSettings() {
  const s = await getConsoleSession();
  if (!s || !canView(s, "payments")) return { error: "You do not have access to Payments.", settings: null };
  try {
    const row = await gatewayRow();
    return {
      error: null,
      settings: {
        keyId: row?.key_id ?? "",
        hasSecret: !!row?.key_secret_enc,
        hasWebhookSecret: !!row?.webhook_secret_enc,
        enabled: !!row?.enabled,
        fromEnv: !row && !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      },
    };
  } catch {
    return { error: "Payment settings table is missing. Run supabase/migration_47.sql in the Supabase SQL editor.", settings: null };
  }
}

export async function savePaymentSettings(input: { keyId: string; keySecret: string; webhookSecret: string; enabled: boolean }) {
  const g = await guard("payments");
  if (g) return { error: g };

  const keyId = String(input.keyId ?? "").trim();
  if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) return { error: "Key ID should look like rzp_live_xxxxxxxx (or rzp_test_…)." };

  let existing: GatewayRow | null;
  try {
    existing = await gatewayRow();
  } catch {
    return { error: "Payment settings table is missing. Run supabase/migration_47.sql in the Supabase SQL editor." };
  }

  const newSecret = String(input.keySecret ?? "").trim();
  const newWebhook = String(input.webhookSecret ?? "").trim();
  let secretPlain = newSecret;
  try {
    if (!secretPlain && existing?.key_secret_enc) secretPlain = decryptSecret(existing.key_secret_enc);
  } catch {
    return { error: "The saved secret could not be read. Please type the key secret again." };
  }
  if (!secretPlain) return { error: "Enter the Key Secret." };
  if (input.enabled && !newWebhook && !existing?.webhook_secret_enc) {
    return { error: "Enter a webhook secret (and add the same one in Razorpay) so paid plans switch on automatically." };
  }

  // Check the keys with Razorpay before saving, so a typo is caught right here.
  try {
    await new Razorpay({ key_id: keyId, key_secret: secretPlain }).orders.all({ count: 1 });
  } catch (e) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 401) return { error: "Razorpay rejected these keys. Check the Key ID and Key Secret." };
    return { error: "Could not reach Razorpay to check the keys. Please try again." };
  }

  let secretEnc: string, webhookEnc: string | null;
  try {
    secretEnc = newSecret ? encryptSecret(newSecret) : existing!.key_secret_enc!;
    webhookEnc = newWebhook ? encryptSecret(newWebhook) : existing?.webhook_secret_enc ?? null;
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await createAdminClient()
    .from("payment_gateway" as never)
    .upsert({
      provider: "razorpay",
      key_id: keyId,
      key_secret_enc: secretEnc,
      webhook_secret_enc: webhookEnc,
      enabled: !!input.enabled,
      updated_at: new Date().toISOString(),
    } as never);
  if (error) return { error: error.message };

  // Public flag (no secrets) so the app knows whether to show Upgrade or "Coming soon".
  return saveSetting("payments_enabled", !!input.enabled);
}
