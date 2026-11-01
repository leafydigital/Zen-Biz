import { cookies } from "next/headers";
import { createHash, createHmac, randomInt, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { TEAM_EMAIL_DOMAIN } from "@/lib/teamUsername";

const secret = () => process.env.OTP_SECRET || process.env.EMAIL_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "zenbiz-otp";
const hmac = (s: string) => createHmac("sha256", secret()).update(s).digest("hex");
const hash = (email: string, purpose: string, code: string) => hmac(`${email}|${purpose}|${code}`);

function safeEq(a: string, b: string) {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** Sends a 6-digit code from the platform Gmail (GMAIL_USER / GMAIL_APP_PASSWORD). */
export async function sendOtp(rawEmail: string, purpose: string): Promise<{ error: string | null }> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return { error: "Verification emails aren't set up on the server yet (GMAIL_USER / GMAIL_APP_PASSWORD)." };

  const admin = createAdminClient();
  const { data: prev } = (await admin.from("email_otps" as never).select("created_at").eq("email", email).eq("purpose", purpose).maybeSingle()) as { data: { created_at: string } | null };
  if (prev && Date.now() - new Date(prev.created_at).getTime() < 45_000) return { error: "Please wait a moment before asking for another code." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error: dbErr } = await admin.from("email_otps" as never).upsert({
    email,
    purpose,
    code_hash: hash(email, purpose, code),
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    attempts: 0,
    created_at: new Date().toISOString(),
  } as never);
  if (dbErr) return { error: dbErr.message };

  try {
    // @ts-ignore - nodemailer is installed with: npm i nodemailer
    const nodemailer: any = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass: pass.replace(/\s/g, "") } });
    await transport.sendMail({
      from: `"Zen Biz" <${user}>`,
      to: email,
      subject: `Your Zen Biz verification code: ${code}`,
      text: `Your Zen Biz verification code is ${code}. It is valid for 10 minutes. If you didn't ask for it, ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px"><p>Your Zen Biz verification code is</p><p style="font-size:30px;letter-spacing:6px;font-weight:bold">${code}</p><p style="color:#666">Valid for 10 minutes. If you didn't ask for it, ignore this email.</p></div>`,
    });
  } catch (err) {
    return { error: `Couldn't send the email: ${(err as Error).message}` };
  }
  return { error: null };
}

/** Checks a code. A correct code is single-use. */
export async function checkOtp(rawEmail: string, purpose: string, code: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  const admin = createAdminClient();
  const { data } = (await admin.from("email_otps" as never).select("*").eq("email", email).eq("purpose", purpose).maybeSingle()) as {
    data: { code_hash: string; expires_at: string; attempts: number } | null;
  };
  if (!data || new Date(data.expires_at) < new Date() || data.attempts >= 5) return false;
  const ok = safeEq(data.code_hash, hash(email, purpose, code.trim()));
  if (ok) await admin.from("email_otps" as never).delete().eq("email", email).eq("purpose", purpose);
  else await admin.from("email_otps" as never).update({ attempts: data.attempts + 1 } as never).eq("email", email).eq("purpose", purpose);
  return ok;
}

/** Short-lived proof that an email was verified (used to submit a ticket). */
export function makeVerifyToken(email: string, purpose: string) {
  const exp = String(Date.now() + 30 * 60_000);
  return `${exp}.${hmac(`${email.toLowerCase()}|${purpose}|${exp}`)}`;
}
export function checkVerifyToken(email: string, purpose: string, token: string) {
  const [exp, sig] = (token || "").split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEq(sig, hmac(`${email.toLowerCase()}|${purpose}|${exp}`));
}

// ---- Login verification (second step after the password) ----
const LOGIN_COOKIE = "zb_login_ok";

export function loginOtpRequired(user: { id: string; email?: string | null; app_metadata?: Record<string, any> }) {
  if (!user.email || user.email.endsWith(`@${TEAM_EMAIL_DOMAIN}`)) return false; // team usernames have no inbox
  if ((user.app_metadata?.provider ?? "email") !== "email") return false; // Google already verified
  const raw = cookies().get(LOGIN_COOKIE)?.value;
  if (!raw) return true;
  const [uid, exp, sig] = raw.split(".");
  if (uid !== user.id || Number(exp) < Date.now()) return true;
  return !safeEq(sig ?? "", hmac(`login|${uid}|${exp}`));
}
export function markLoginVerified(userId: string) {
  const exp = String(Date.now() + 30 * 24 * 3600_000);
  cookies().set(LOGIN_COOKIE, `${userId}.${exp}.${hmac(`login|${userId}|${exp}`)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 3600,
  });
}
export function clearLoginVerified() {
  cookies().delete(LOGIN_COOKIE);
}
