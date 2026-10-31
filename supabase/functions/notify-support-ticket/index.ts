// Supabase Database Webhook target — fires whenever a new row is inserted
// into public.support_tickets, and forwards the ticket details to
// leafydigital@gmail.com via Brevo's transactional email API.
//
// This is a separate, independent integration from the SMTP setup used
// for signup/reset emails — those go through Supabase Auth's own SMTP
// config, but a webhook calling this function needs to send email
// itself, so it uses Brevo's REST API directly with an API key (not the
// SMTP username/password used elsewhere).
//
// Deploy with: supabase functions deploy notify-support-ticket
// Then wire it up in Supabase Dashboard -> Database -> Webhooks:
//   - Table: support_tickets
//   - Events: Insert
//   - Type: Supabase Edge Function
//   - Function: notify-support-ticket
//
// Required secret (set via `supabase secrets set BREVO_API_KEY=...`):
//   BREVO_API_KEY — from Brevo dashboard -> SMTP & API -> API Keys
//   (a different kind of key than the SMTP key used for Supabase Auth's
//   own SMTP settings — generate a dedicated "API Key" there, not the
//   SMTP key.)

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const NOTIFY_EMAIL = "leafydigital@gmail.com";

interface SupportTicketRow {
  id: string;
  ticket_type: "info" | "issue";
  name: string;
  whatsapp_number: string | null;
  email: string;
  address: string | null;
  pincode: string | null;
  notes: string | null;
  message: string;
  screenshot_url: string | null;
  created_at: string;
}

interface DatabaseWebhookPayload {
  type: "INSERT";
  table: string;
  record: SupportTicketRow;
}

serve(async (req) => {
  try {
    const payload: DatabaseWebhookPayload = await req.json();
    const ticket = payload.record;

    if (!ticket) {
      return new Response(JSON.stringify({ error: "No ticket record in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "BREVO_API_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const typeLabel = ticket.ticket_type === "issue" ? "Issue Report" : "Info Request";
    const subject = `[Zen Biz] New ${typeLabel} from ${ticket.name}`;

    const htmlBody = `
      <h2>New Contact Us submission — ${typeLabel}</h2>
      <p><strong>Name:</strong> ${escapeHtml(ticket.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(ticket.email)}</p>
      <p><strong>WhatsApp:</strong> ${escapeHtml(ticket.whatsapp_number ?? "—")}</p>
      <p><strong>Address:</strong> ${escapeHtml(ticket.address ?? "—")}</p>
      <p><strong>Pincode:</strong> ${escapeHtml(ticket.pincode ?? "—")}</p>
      <p><strong>Notes:</strong> ${escapeHtml(ticket.notes ?? "—")}</p>
      <p><strong>Message:</strong><br>${escapeHtml(ticket.message).replace(/\n/g, "<br>")}</p>
      ${ticket.screenshot_url ? `<p><strong>Screenshot:</strong> <a href="${ticket.screenshot_url}">${ticket.screenshot_url}</a></p>` : ""}
      <p><small>Ticket ID: ${ticket.id} · Submitted: ${ticket.created_at}</small></p>
    `;

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        sender: { name: "Zen Biz Support", email: "hello@leafydigital.in" },
        to: [{ email: NOTIFY_EMAIL }],
        replyTo: { email: ticket.email, name: ticket.name },
        subject,
        htmlContent: htmlBody,
      }),
    });

    if (!brevoResponse.ok) {
      const errText = await brevoResponse.text();
      console.error("Zen Biz: Brevo send failed", errText);
      return new Response(JSON.stringify({ error: "Failed to send notification email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Zen Biz: notify-support-ticket error", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
