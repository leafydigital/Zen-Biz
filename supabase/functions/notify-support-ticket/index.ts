// Supabase Database Webhook target — fires whenever a new row is inserted
// into public.support_tickets, and emails the ticket details to
// leafydigital@gmail.com via Resend's email API.
//
// Why Resend and not Gmail's own SMTP: Supabase Edge Functions run on
// Deno Deploy, which does not allow outgoing connections on the ports
// Gmail's SMTP requires (465/587) — this is a platform-level network
// restriction, not something fixable in this function's code. Resend
// sends over a normal HTTPS API call instead, which isn't blocked, and
// the email still lands in the same leafydigital@gmail.com inbox — it's
// just delivered TO Gmail rather than sent THROUGH Gmail's own servers.
//
// Deploy with: supabase functions deploy notify-support-ticket
// Then wire it up in Supabase Dashboard -> Integrations -> Webhooks:
//   - Table: support_tickets
//   - Events: Insert
//   - Type: Supabase Edge Function
//   - Function: notify-support-ticket
//
// Required secret (set via `supabase secrets set RESEND_API_KEY=...`):
//   RESEND_API_KEY — from resend.com -> API Keys, after creating a free
//   account. No domain verification is required to START sending as
//   long as the "from" address uses Resend's own onboarding@resend.dev
//   sender (used below) — good enough for this internal notification
//   use case. Verifying your own domain later improves deliverability
//   but isn't required to get this working.

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

Deno.serve(async (req: Request) => {
  try {
    const payload: DatabaseWebhookPayload = await req.json();
    const ticket = payload.record;

    if (!ticket) {
      return new Response(JSON.stringify({ error: "No ticket record in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY is not configured" }), {
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

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "Zen Biz Support <onboarding@resend.dev>",
        to: [NOTIFY_EMAIL],
        reply_to: ticket.email,
        subject,
        html: htmlBody,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Zen Biz: Resend send failed", resendResult);
      return new Response(JSON.stringify({ error: "Failed to send notification email", details: resendResult }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: resendResult.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Zen Biz: notify-support-ticket error", err);
    return new Response(JSON.stringify({ error: "Unexpected error", details: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
