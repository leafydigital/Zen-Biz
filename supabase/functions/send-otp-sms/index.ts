// Supabase Auth "Send SMS" Hook — bridges Supabase's phone OTP system to
// Fast2SMS, since Fast2SMS isn't one of Supabase's natively-supported SMS
// providers (Twilio, MessageBird, Vonage, TextLocal). Supabase generates
// the OTP itself and calls this function with the phone number and code;
// this function's only job is to actually deliver that code via Fast2SMS
// and tell Supabase whether it succeeded.
//
// Deploy with: supabase functions deploy send-otp-sms
// Then register it as the Send SMS Hook in Supabase Dashboard ->
// Authentication -> Hooks (Auth Hooks), pointing at this function's URL.
//
// Required secret (set via `supabase secrets set FAST2SMS_API_KEY=...`):
//   FAST2SMS_API_KEY — from Fast2SMS dashboard -> Dev API

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

interface SupabaseSmsHookPayload {
  user: { phone?: string };
  sms: { otp: string };
}

serve(async (req) => {
  try {
    const payload: SupabaseSmsHookPayload = await req.json();
    const phone = payload.user?.phone;
    const otp = payload.sms?.otp;

    if (!phone || !otp) {
      return new Response(JSON.stringify({ error: "Missing phone or otp in hook payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FAST2SMS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "FAST2SMS_API_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fast2SMS's OTP route expects a bare 10-digit Indian number, not the
    // E.164 "+91..." format Supabase sends — strip any country code and
    // non-digit characters, then take the last 10 digits.
    const digitsOnly = phone.replace(/[^0-9]/g, "");
    const localNumber = digitsOnly.slice(-10);

    const fast2smsUrl = new URL("https://www.fast2sms.com/dev/bulkV2");
    fast2smsUrl.searchParams.set("authorization", apiKey);
    fast2smsUrl.searchParams.set("variables_values", otp);
    fast2smsUrl.searchParams.set("route", "otp");
    fast2smsUrl.searchParams.set("numbers", localNumber);

    const smsResponse = await fetch(fast2smsUrl.toString(), { method: "GET" });
    const smsResult = await smsResponse.json();

    if (!smsResponse.ok || smsResult.return !== true) {
      console.error("Zen Biz: Fast2SMS send failed", smsResult);
      return new Response(JSON.stringify({ error: "SMS provider failed to send the code" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Supabase's Send SMS Hook expects an empty 200 response on success —
    // it does not read a response body to determine success/failure.
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Zen Biz: send-otp-sms hook error", err);
    return new Response(JSON.stringify({ error: "Unexpected error sending OTP" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
