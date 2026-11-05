import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/emailCrypto";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
}

/**
 * The Razorpay account plan payments go to. Saved by the owner in the console
 * (/app → Payments). Falls back to the RAZORPAY_* environment variables so an
 * older setup keeps working. Server-only: it returns the secrets.
 */
export async function getRazorpayConfig(): Promise<RazorpayConfig | null> {
  try {
    const { data } = (await createAdminClient()
      .from("payment_gateway" as never)
      .select("key_id, key_secret_enc, webhook_secret_enc, enabled")
      .eq("provider", "razorpay")
      .maybeSingle()) as {
      data: { key_id: string | null; key_secret_enc: string | null; webhook_secret_enc: string | null; enabled: boolean } | null;
    };
    if (data) {
      if (!data.enabled || !data.key_id || !data.key_secret_enc) return null;
      return {
        keyId: data.key_id,
        keySecret: decryptSecret(data.key_secret_enc),
        webhookSecret: data.webhook_secret_enc ? decryptSecret(data.webhook_secret_enc) : null,
      };
    }
  } catch (e) {
    console.error("Zen Biz: could not read payment settings", e);
  }
  // Only real (live) keys count; a placeholder or a test key in the env file is ignored.
  if (process.env.RAZORPAY_KEY_ID?.startsWith("rzp_live_") && process.env.RAZORPAY_KEY_SECRET) {
    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? null,
    };
  }
  return null;
}
