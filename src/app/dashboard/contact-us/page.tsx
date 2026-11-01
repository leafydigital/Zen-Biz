import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { getAppConfig } from "@/lib/getAppConfig";
import { formatWorkingHours } from "@/lib/appConfigDefaults";
import { MyTickets } from "@/components/MyTickets";
import type { SupportTicket } from "@/types/database";
import { ContactUsTab } from "@/components/ContactUsTab";

export default async function ContactUsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeBusiness = await getActiveBusiness();
  const { contact } = await getAppConfig();
  const { data: myTickets } = (await supabase
    .from("support_tickets" as never)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)) as { data: SupportTicket[] | null };
  const rows = [
    ["Email", contact.email, contact.email ? `mailto:${contact.email}` : ""],
    ["WhatsApp", contact.whatsapp, contact.whatsapp ? `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}` : ""],
    ["Address", contact.address, ""],
    ["Working hours", formatWorkingHours(contact), ""],
  ].filter((r) => r[1]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Contact Us</h1>
        <p className="text-sm text-text-soft">
          Have a question or ran into an issue? Send us a message and we'll get back to you.
        </p>
      </div>
      {(rows.length > 0 || contact.message) && (
        <div className="rounded-xl2 border border-paper-fold bg-white p-5 shadow-card">
          {contact.message && <p className="mb-2 text-sm text-text">{contact.message}</p>}
          <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {rows.map(([label, value, href]) => (
              <div key={label}>
                <dt className="text-xs font-medium text-text-soft">{label}</dt>
                <dd className="text-text">
                  {href ? (
                    <a href={href} className="font-medium text-ink underline" target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{value}</a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      <ContactUsTab userId={user.id} businessId={activeBusiness?.id ?? null} defaultEmail={user.email ?? ""} />
      <MyTickets tickets={myTickets ?? []} />
    </div>
  );
}
