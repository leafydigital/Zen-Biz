export const APK_URL = "https://github.com/leafydigital/Zen-Biz/releases/download/downloads/ZenBiz.apk";

/**
 * Starts the .apk download in the phone's own browser / download manager.
 * The in-app browser tab (Capacitor Browser plugin) often fails on file downloads, so
 * instead the link is opened as an external link: the Android app passes any address
 * outside Zen Biz to the phone's default browser, which downloads the file and then
 * offers Install.
 */
export function openApkDownload() {
  try {
    window.location.assign(APK_URL);
  } catch {
    window.open(APK_URL, "_system");
  }
}
