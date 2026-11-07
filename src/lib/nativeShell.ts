/** True inside the Android app or the Windows app (not in a normal browser). */
export function isNativeShell(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return !!cap?.isNativePlatform?.() || navigator.userAgent.includes("Electron");
}
