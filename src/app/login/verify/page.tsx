import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginOtpRequired } from "@/lib/otp";
import { LoginOtpForm } from "@/components/LoginOtpForm";

export const dynamic = "force-dynamic";

export default async function VerifyLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (!user) redirect("/login");
  if (!loginOtpRequired(user)) redirect("/dashboard");
  const next = searchParams.next && searchParams.next.startsWith("/") && !searchParams.next.startsWith("//") ? searchParams.next : "/dashboard";
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <LoginOtpForm email={user.email ?? ""} next={next} />
    </main>
  );
}
