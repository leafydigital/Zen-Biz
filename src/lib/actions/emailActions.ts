"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret, encryptSecret } from "@/lib/emailCrypto";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Emails an invoice / bill PDF straight from Zen Biz. The PDF is built in the
 * browser and passed in as base64. The caller must be able to read the invoice
 * (checked with their own session/RLS). Needs RESEND_API_KEY and
 * RESEND_FROM_EMAIL (an address on a domain verified in Resend) on the server.
 */
export async function sendInvoiceEmail(input: {
  invoiceId?: string;
  /** For reports: the business to send as (instead of an invoice). */
  businessId?: string;
  to: string;
  subject: string;
  message: string;
  pdfBase64: string;
  filename: string;
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const to = input.to.trim();
  if (!EMAIL_RE.test(to)) return { error: "Enter a valid customer email address." };
  if (!input.pdfBase64 || input.pdfBase64.length > 14_000_000) return { error: "The PDF is missing or too large." };

  let invoice: { id: string; business_id: string } | null = null;
  if (input.invoiceId) {
    const { data } = (await supabase
      .from("invoices" as never)
      .select("id, business_id")
      .eq("id", input.invoiceId)
      .maybeSingle()) as { data: { id: string; business_id: string } | null };
    invoice = data;
  } else if (input.businessId) {
    const { data } = (await supabase
      .from("businesses" as never)
      .select("id")
      .eq("id", input.businessId)
      .maybeSingle()) as { data: { id: string } | null };
    invoice = data ? { id: data.id, business_id: data.id } : null;
  }
  if (!invoice) return { error: "You don't have access to this document." };

  const { data: business } = (await supabase
    .from("businesses" as never)
    .select("business_name, email")
    .eq("id", invoice.business_id)
    .maybeSingle()) as { data: { business_name: string; email: string | null } | null };

  const name = (business?.business_name ?? "Zen Biz").replace(/["<>\r\n]/g, "");
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(input.message)}</div>`;

  const filename = input.filename.replace(/[^\w.\- ]/g, "_");
  const subject = input.subject.slice(0, 200);

  // Option 1: the business's own connected Gmail (Settings → General → Email sending).
  let smtpUser = process.env.GMAIL_USER;
  let smtpPass = process.env.GMAIL_APP_PASSWORD;
  try {
    const { data: conn } = (await createAdminClient()
      .from("business_email_settings" as never)
      .select("smtp_email, smtp_password_enc")
      .eq("business_id", invoice.business_id)
      .maybeSingle()) as { data: { smtp_email: string; smtp_password_enc: string } | null };
    if (conn) {
      smtpUser = conn.smtp_email;
      smtpPass = decryptSecret(conn.smtp_password_enc);
    }
  } catch {
    /* fall back to the platform address below */
  }
  if (smtpUser && smtpPass) {
    try {
      // @ts-ignore - nodemailer is installed with: npm i nodemailer
      const nodemailer: any = (await import("nodemailer")).default;
      const transport = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user: smtpUser, pass: smtpPass.replace(/\s/g, "") },
      });
      await transport.sendMail({
        from: `"${name}" <${smtpUser}>`,
        to,
        replyTo: business?.email || undefined,
        subject,
        text: input.message,
        html,
        attachments: [{ filename, content: Buffer.from(input.pdfBase64, "base64"), contentType: "application/pdf" }],
      });
      return { error: null };
    } catch (err) {
      return { error: (err as Error).message || "Could not send the email through Gmail." };
    }
  }

  // Option 2: Resend (free plan, needs a verified domain for real customers).
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromAddress) {
    return { error: "Email sending isn't set up on the server yet (an owner or admin can connect Gmail in Settings → General → Email sending)." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `${name} <${fromAddress}>`,
      to: [to],
      ...(business?.email ? { reply_to: business.email } : {}),
      subject,
      html,
      text: input.message,
      attachments: [{ filename, content: input.pdfBase64 }],
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { message?: string }).message ?? "";
    } catch {}
    return { error: detail || `Email service error (${res.status}).` };
  }
  return { error: null };
}


async function assertCanEdit(businessId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Not signed in.";
  const { data } = await supabase.rpc("can_edit_business_settings" as never, { check_business_id: businessId } as never);
  return data ? null : "Only an owner or an admin with General settings access can change this.";
}

/** Who sees what: any member can see the connected address; the password is never returned. */
export async function getEmailConnection(businessId: string): Promise<{ email: string | null; error?: string; businesses?: { id: string; name: string }[] }> {
  try {
    const supabase = createClient();
    const { data: biz } = await supabase.from("businesses" as never).select("id, owner_id").eq("id", businessId).maybeSingle();
    if (!biz) return { email: null };
    const { data, error } = (await createAdminClient()
      .from("business_email_settings" as never)
      .select("smtp_email")
      .eq("business_id", businessId)
      .maybeSingle()) as { data: { smtp_email: string } | null; error: { message: string } | null };
    if (error) return { email: null, error: error.message };

    // Other businesses of the same owner that this user is allowed to change.
    const { data: mine } = (await supabase
      .from("businesses" as never)
      .select("id, business_name, owner_id")
      .eq("owner_id", (biz as { owner_id?: string }).owner_id ?? "")) as { data: { id: string; business_name: string }[] | null };
    const businesses: { id: string; name: string }[] = [];
    for (const b of mine ?? []) {
      const { data: ok } = await supabase.rpc("can_edit_business_settings" as never, { check_business_id: b.id } as never);
      if (ok) businesses.push({ id: b.id, name: b.business_name });
    }
    return { email: data?.smtp_email ?? null, businesses };
  } catch (err) {
    return { email: null, error: (err as Error).message };
  }
}

export async function saveEmailConnection(input: {
  businessId: string;
  email: string;
  appPassword: string;
  /** Other businesses (same owner) that should use this Gmail too. */
  alsoBusinessIds?: string[];
}): Promise<{ error: string | null }> {
  const denied = await assertCanEdit(input.businessId);
  if (denied) return { error: denied };
  const targets = [input.businessId];
  {
    const supabase = createClient();
    const { data: cur } = await supabase.from("businesses" as never).select("owner_id").eq("id", input.businessId).maybeSingle();
    for (const id of input.alsoBusinessIds ?? []) {
      if (id === input.businessId) continue;
      const { data: b } = await supabase.from("businesses" as never).select("owner_id").eq("id", id).maybeSingle();
      if (!b || (b as { owner_id: string }).owner_id !== (cur as { owner_id: string } | null)?.owner_id) continue;
      if (await assertCanEdit(id)) continue;
      targets.push(id);
    }
  }
  const email = input.email.trim().toLowerCase();
  const pass = input.appPassword.replace(/\s/g, "");
  if (!EMAIL_RE.test(email)) return { error: "Enter a valid Gmail address." };
  if (pass.length < 8) return { error: "Enter the 16-letter App Password from Google." };

  try {
    // @ts-ignore - nodemailer is installed with: npm i nodemailer
    const nodemailer: any = (await import("nodemailer")).default;
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: email, pass },
    });
    await transport.verify();
  } catch {
    return { error: "Gmail didn't accept these details. Check the address and the 16-letter App Password (not your normal password)." };
  }

  try {
    const { error } = await createAdminClient()
      .from("business_email_settings" as never)
      .upsert(
        targets.map((id) => ({
          business_id: id,
          smtp_email: email,
          smtp_password_enc: encryptSecret(pass),
          updated_at: new Date().toISOString(),
        })) as never
      );
    if (error) return { error: error.message };
  } catch (err) {
    return { error: (err as Error).message };
  }
  return { error: null };
}

export async function removeEmailConnection(businessId: string): Promise<{ error: string | null }> {
  const denied = await assertCanEdit(businessId);
  if (denied) return { error: denied };
  const { error } = await createAdminClient()
    .from("business_email_settings" as never)
    .delete()
    .eq("business_id", businessId);
  return { error: error?.message ?? null };
}

/** Copies this business's connected Gmail to the owner's other businesses (no password re-entry needed). */
export async function shareEmailConnection(businessId: string): Promise<{ error: string | null }> {
  const denied = await assertCanEdit(businessId);
  if (denied) return { error: denied };
  try {
    const admin = createAdminClient();
    const { data: cur } = (await admin
      .from("business_email_settings" as never)
      .select("smtp_email, smtp_password_enc")
      .eq("business_id", businessId)
      .maybeSingle()) as { data: { smtp_email: string; smtp_password_enc: string } | null };
    if (!cur) return { error: "Connect a Gmail first." };

    const supabase = createClient();
    const { data: me } = await supabase.from("businesses" as never).select("owner_id").eq("id", businessId).maybeSingle();
    const { data: list } = (await supabase
      .from("businesses" as never)
      .select("id")
      .eq("owner_id", (me as { owner_id: string } | null)?.owner_id ?? "")) as { data: { id: string }[] | null };
    const rows = [];
    for (const b of list ?? []) {
      if (b.id === businessId || (await assertCanEdit(b.id))) continue;
      rows.push({ business_id: b.id, smtp_email: cur.smtp_email, smtp_password_enc: cur.smtp_password_enc, updated_at: new Date().toISOString() });
    }
    if (rows.length) {
      const { error } = await admin.from("business_email_settings" as never).upsert(rows as never);
      if (error) return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
