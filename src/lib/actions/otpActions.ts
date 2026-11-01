"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkOtp, checkVerifyToken, clearLoginVerified, makeVerifyToken, markLoginVerified, sendOtp } from "@/lib/otp";

async function currentUser() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  return user;
}

// ---- Support tickets ----
const GMAIL_RE = /^[^\s@]+@gmail\.com$/i;

export async function sendTicketOtp(email: string) {
  if (!(await currentUser())) return { error: "Not signed in." };
  if (!GMAIL_RE.test(email.trim())) return { error: "Please use a Gmail address ending in @gmail.com." };
  return sendOtp(email, "ticket");
}

export async function verifyTicketOtp(email: string, code: string): Promise<{ error: string | null; token?: string }> {
  if (!(await currentUser())) return { error: "Not signed in." };
  if (!(await checkOtp(email, "ticket", code))) return { error: "That code is wrong or has expired." };
  return { error: null, token: makeVerifyToken(email, "ticket") };
}

export async function submitSupportTicket(input: {
  businessId: string | null;
  ticketType: "info" | "issue";
  name: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  pincode: string;
  notes: string;
  message: string;
  screenshotUrl: string | null;
  verifyToken: string;
}): Promise<{ error: string | null; ticketNo?: string }> {
  const user = await currentUser();
  if (!user) return { error: "Not signed in." };
  if (!checkVerifyToken(input.email, "ticket", input.verifyToken)) return { error: "Please verify your email with the code first." };
  if (!GMAIL_RE.test(input.email.trim())) return { error: "Please use a Gmail address ending in @gmail.com." };
  if (!/^\+\d{1,4}\d{10}$/.test(input.phone.trim())) return { error: "Enter a 10-digit phone number." };
  if (input.whatsappNumber.trim() && !/^\+\d{1,4}\d{10}$/.test(input.whatsappNumber.trim())) return { error: "Enter a 10-digit WhatsApp number." };
  if (!input.name.trim() || !input.message.trim()) return { error: "Name and message are required." };
  const { data: created, error } = (await createClient().from("support_tickets" as never).insert({
    user_id: user.id,
    business_id: input.businessId,
    ticket_type: input.ticketType,
    name: input.name.trim(),
    phone: input.phone.trim(),
    whatsapp_number: input.whatsappNumber.trim() || null,
    email: input.email.trim(),
    address: input.address.trim() || null,
    pincode: input.pincode.trim() || null,
    notes: input.notes.trim() || null,
    message: input.message.trim(),
    screenshot_url: input.screenshotUrl,
  } as never).select("ticket_no").single()) as { data: { ticket_no: number | null } | null; error: { message: string } | null };
  if (error) return { error: error.message };
  revalidatePath("/dashboard/contact-us");
  return { error: null, ticketNo: created?.ticket_no ? `ZB-${created.ticket_no}` : undefined };
}

// ---- Login verification ----
export async function sendLoginOtp(): Promise<{ error: string | null; email?: string }> {
  const user = await currentUser();
  if (!user?.email) return { error: "Not signed in." };
  const r = await sendOtp(user.email, "login");
  return r.error ? { error: r.error } : { error: null, email: user.email };
}

export async function verifyLoginOtp(code: string): Promise<{ error: string | null }> {
  const user = await currentUser();
  if (!user?.email) return { error: "Not signed in." };
  if (!(await checkOtp(user.email, "login", code))) return { error: "That code is wrong or has expired." };
  markLoginVerified(user.id);
  return { error: null };
}

export async function clearLoginVerification() {
  clearLoginVerified();
}

/** After the sign-up code was accepted, skip the extra login code for this fresh session. */
export async function markSignupVerified(): Promise<{ error: string | null }> {
  const user = await currentUser();
  if (!user || !user.email_confirmed_at) return { error: "Not verified." };
  markLoginVerified(user.id);
  return { error: null };
}
