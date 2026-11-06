// Zen Biz desktop app: a window around the live website, so every website
// update reaches the PC app automatically (no reinstall needed).
const { app, BrowserWindow, shell, Menu } = require("electron");

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
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  Menu.setApplicationMenu(null);
  win.loadURL(SITE);
  win.webContents.on("did-fail-load", (_e, code, _d, _u, isMain) => {
    if (!isMain || code === -3) return;
    win.loadURL(
      "data:text/html;charset=utf-8," +
        encodeURIComponent(
          `<body style="font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;color:#333"><div><h2>Zen Biz</h2><p>Can't reach the internet.<br>Check your connection and try again.</p><button onclick="location.href='${SITE}'" style="padding:10px 20px;border:0;border-radius:10px;background:#1a1a1a;color:#fff;font-size:16px">Try again</button></div></body>`
        )
    );
  });
  // Links to other sites open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (ALLOWED(new URL(url).hostname)) return { action: "allow" };
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

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});
app.whenReady().then(create);
app.on("window-all-closed", () => app.quit());
