import type { Metadata } from "next";
import { getAppConfig } from "@/lib/getAppConfig";
import { getPlanFeatures } from "@/lib/planFeatures";
import { AboutAppTabs } from "@/components/AboutAppTabs";

export const metadata: Metadata = { title: "About Zen Biz", description: "What Zen Biz is, how to use it, its features and pricing." };

export default async function AboutAppPage({ searchParams }: { searchParams: { tab?: string } }) {
  const cfg = await getAppConfig();
  return (
    <main className="min-h-screen bg-paper">
      <AboutAppTabs
        pricing={cfg.pricing}
        starter={getPlanFeatures("starter").limits}
        professional={getPlanFeatures("professional").limits}
        business={getPlanFeatures("business").limits}
        initialTab={searchParams.tab}
      />
    </main>
  );
}
