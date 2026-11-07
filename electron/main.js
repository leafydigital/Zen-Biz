// Zen Biz desktop app: a window around the live website, so every website
// update reaches the PC app automatically (no reinstall needed).
const { app, BrowserWindow, shell, Menu, session, dialog, ipcMain } = require("electron");
const path = require("path");

const SITE = "https://zen-biz-ka6g.vercel.app/";
const HOST = new URL(SITE).hostname;
const ALLOWED = (h) => h === HOST || h.endsWith(".supabase.co") || h.endsWith(".razorpay.com") || h === "accounts.google.com";

if (!app.requestSingleInstanceLock()) app.quit();

let win;
function create() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "Zen Biz",
    autoHideMenuBar: true,
    backgroundColor: "#ffffff",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, "preload.js") },
  });
  Menu.setApplicationMenu(null);
  win.webContents.on("did-finish-load", addBackButton);
  win.webContents.on("did-navigate-in-page", addBackButton);
  // Alt+Left / mouse back button / Escape-free: go back like a browser.
  win.on("app-command", (_e, cmd) => {
    if (cmd === "browser-backward" && win.webContents.canGoBack()) win.webContents.goBack();
  });
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type === "keyDown" && input.alt && input.key === "ArrowLeft" && win.webContents.canGoBack()) {
      e.preventDefault();
      win.webContents.goBack();
    }
  });
  win.loadURL(SITE);
  win.webContents.on("did-fail-load", (_e, code, _d, _u, isMain) => {
    if (!isMain || code === -3) return;
    win.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(
          `<body style="font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;color:#333"><div><h2>Zen Biz</h2><p>Can't reach the internet.<br>Check your connection and try again.</p><button onclick="location.href='${SITE}'" style="padding:10px 20px;border:0;border-radius:10px;background:#1a1a1a;color:#fff;font-size:16px">Try again</button></div><script>addEventListener('online',()=>location.href='${SITE}')</script></body>`
        )
    );
  });
  // Google sign-in opens in this same window (not a separate popup) so it can
  // show a Back button and return to Zen Biz afterwards.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (ALLOWED(new URL(url).hostname)) {
        win.loadURL(url);
        return { action: "deny" };
      }
    } catch {}
    shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    try {
      if (ALLOWED(new URL(url).hostname)) return;
    } catch {}
    e.preventDefault();
    shell.openExternal(url);
  });
}

// Floating "Back" button on Google's sign-in page (it has none of its own).
function addBackButton() {
  if (!win || win.isDestroyed()) return;
  let host = "";
  try {
    host = new URL(win.webContents.getURL()).hostname;
  } catch {}
  if (host !== "accounts.google.com") return;
  win.webContents
    .executeJavaScript(
      `(function(){if(document.getElementById('zb-back'))return;var b=document.createElement('button');b.id='zb-back';b.title='Back to Zen Biz';b.setAttribute('aria-label','Back to Zen Biz');b.innerHTML='&#8592; Back';b.style.cssText='position:fixed;top:12px;left:12px;z-index:2147483647;padding:9px 16px;border:0;border-radius:10px;background:#1a1a1a;color:#fff;font:600 14px system-ui;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)';b.onclick=function(){location.href='${SITE}login'};document.body.appendChild(b)})()`
    )
    .catch(() => {});
}

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.whenReady().then(() => {
  // Camera (barcode scanning) is allowed for Zen Biz itself; Windows asks once and remembers.
  const ok = (url) => {
    try {
      return new URL(url).hostname === HOST;
    } catch {
      return false;
    }
  };
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(permission === "media" && ok(wc.getURL())));
  session.defaultSession.setPermissionCheckHandler((_wc, permission, origin) => permission === "media" && ok(origin));
  create();
});
// Program updates: when a newer Zen Biz is published, ask once, then download and
// restart into it. No uninstall / reinstall. (Website changes need no update at all.)
let updater = null;
let uiCheck = false; // a check started from Settings → Updates (it shows its own result, no dialog)

ipcMain.handle("zb:version", () => app.getVersion());
ipcMain.handle("zb:check", async () => {
  if (!updater) return { status: "dev" };
  uiCheck = true;
  try {
    const r = await updater.checkForUpdates();
    const v = r && r.updateInfo && r.updateInfo.version;
    const available = r && typeof r.isUpdateAvailable === "boolean" ? r.isUpdateAvailable : !!v && v !== app.getVersion();
    return available ? { status: "available", version: v } : { status: "uptodate", version: v };
  } catch {
    return { status: "error" };
  } finally {
    setTimeout(() => (uiCheck = false), 2000);
  }
});
ipcMain.handle("zb:download", async () => {
  if (!updater) return false;
  try {
    await updater.downloadUpdate();
    return true;
  } catch {
    return false;
  }
});
ipcMain.handle("zb:install", () => {
  if (updater) updater.quitAndInstall();
});

function setupUpdater() {
  if (!app.isPackaged) return;
  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch {
    return;
  }
  updater = autoUpdater;
  autoUpdater.autoDownload = false;
  autoUpdater.on("update-available", async (info) => {
    if (uiCheck) return;
    const r = await dialog.showMessageBox(win, {
      type: "info",
      title: "Zen Biz update",
      message: "A new version of Zen Biz is available (" + info.version + ").",
      detail: "Click Update now. The app downloads it and restarts. Nothing to uninstall.",
      buttons: ["Update now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (r.response === 0) autoUpdater.downloadUpdate().catch(() => {});
  });
  autoUpdater.on("update-downloaded", async () => {
    if (uiCheck) return;
    const r = await dialog.showMessageBox(win, {
      type: "info",
      title: "Zen Biz update",
      message: "Update ready.",
      detail: "Zen Biz will close and open again with the new version.",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
    });
    if (r.response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on("error", () => {});
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 8000);
  setInterval(check, 6 * 60 * 60 * 1000);
}
app.whenReady().then(setupUpdater);
app.on("window-all-closed", () => app.quit());
