/**
 * Version of the Zen Biz website/app content running on this device. It is set
 * automatically on every deployment (git commit on Vercel), so nothing has to be
 * typed in by hand. Shown in the menu and on the Updates page.
 */
export function appVersionLabel(build: string | undefined | null = process.env.NEXT_PUBLIC_BUILD_ID): string {
  if (!build) return "dev";
  if (/^\d{12,}$/.test(build)) {
    const d = new Date(Number(build));
    return `${d.toISOString().slice(0, 10)}`;
  }
  return build.slice(0, 7);
}
