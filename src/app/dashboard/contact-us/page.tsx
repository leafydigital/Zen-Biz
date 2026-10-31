import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveBusiness } from "@/lib/getActiveBusiness";
import { ContactUsTab } from "@/components/ContactUsTab";

export default async function ContactUsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeBusiness = await getActiveBusiness();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Contact Us</h1>
        <p className="text-sm text-text-soft">
          Have a question or ran into an issue? Send us a message and we'll get back to you.
        </p>
      </div>
      <ContactUsTab userId={user.id} businessId={activeBusiness?.id ?? null} />
    </div>
  );
}
