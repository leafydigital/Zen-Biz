import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const APK_INFO = "https://github.com/leafydigital/Zen-Biz/releases/download/downloads/apk-version.json";

/**
 * What the apps ask to learn whether an update exists:
 *  - build: id of the website deployment running now (changes on every deploy)
 *  - apk:   latest published Android app build (from the downloads release)
 */
export async function GET() {
  let apk: { versionCode: number; versionName?: string } | null = null;
  try {
    const r = await fetch(APK_INFO, { next: { revalidate: 600 } });
    if (r.ok) {
      const j = await r.json();
      if (Number.isFinite(Number(j?.versionCode))) apk = { versionCode: Number(j.versionCode), versionName: j.versionName };
    }
  } catch {
    /* offline or no release yet */
  }
  return NextResponse.json({ build: process.env.NEXT_PUBLIC_BUILD_ID ?? null, apk }, { headers: { "Cache-Control": "no-store" } });
}
