import { createAdminClient } from "@/lib/supabase/admin";
import { adminConfigured, getConsoleSession } from "@/lib/adminAuth";
import { getAppConfig } from "@/lib/getAppConfig";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminConsole } from "@/components/AdminConsole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zen Biz — Owner console", robots: { index: false, follow: false } };

export default async function OwnerConsolePage() {
  const session = await getConsoleSession();
  if (!session) return <AdminLogin configured={adminConfigured()} />;

  const admin = createAdminClient();
  const [config, ticketsRes, discountsRes, plans] = await Promise.all([
    getAppConfig(),
    admin.from("support_tickets" as never).select("*").order("created_at", { ascending: false }).limit(300),
    admin.from("discount_codes" as never).select("*").order("created_at", { ascending: false }),
    Promise.all(
      ["starter", "professional", "business"].map((p) =>
        admin.from("profiles" as never).select("id", { count: "exact", head: true }).eq("plan", p)
      )
    ),
  ]);
  const { count: businesses } = await admin.from("businesses" as never).select("id", { count: "exact", head: true });

  // Screenshots live in a private bucket — hand out short-lived links.
  const tickets = await Promise.all(
    ((ticketsRes.data ?? []) as any[]).map(async (t) => {
      let shot: string | null = null;
      if (t.screenshot_url) {
        const path = String(t.screenshot_url).split("ticket-screenshots/")[1]?.split("?")[0];
        if (path) {
          const { data } = await admin.storage.from("ticket-screenshots").createSignedUrl(decodeURIComponent(path), 3600);
          shot = data?.signedUrl ?? null;
        }
      }
      return { ...t, screenshot_signed: shot };
    })
  );

  let users: any[] = [];
  if (session.isSuper) {
    const r = await admin.from("console_users" as never).select("id, username, role_name, permissions, active, is_super, created_at").eq("is_super", false).order("created_at", { ascending: true });
    users = (r.data ?? []) as any[];
  }

  return (
    <AdminConsole
      session={session}
      initialUsers={users}
      config={config}
      tickets={tickets}
      discounts={(discountsRes.data ?? []) as any[]}
      stats={{
        starter: plans[0].count ?? 0,
        // Pro = the old Professional + Business plans combined.
        professional: (plans[1].count ?? 0) + (plans[2].count ?? 0),
        business: 0,
        businesses: businesses ?? 0,
      }}
    />
  );
}
