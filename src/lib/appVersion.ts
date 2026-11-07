/**
 * Version of the Zen Biz website/app content on this device, like 1.00.1, 1.00.2 ...
 * It goes up by one automatically with every release (see next.config.mjs), so
 * nothing is typed in by hand. Shown in the menu and on the Updates page.
 */
export function appVersionLabel(): string {
  return process.env.NEXT_PUBLIC_APP_VERSION || "1.00.0";
}
