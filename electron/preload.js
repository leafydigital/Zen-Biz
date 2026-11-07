// Lets the Zen Biz website (inside this PC app) ask the app about program updates.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("zenbizDesktop", {
  getVersion: () => ipcRenderer.invoke("zb:version"),
  checkUpdate: () => ipcRenderer.invoke("zb:check"),
  downloadUpdate: () => ipcRenderer.invoke("zb:download"),
  installUpdate: () => ipcRenderer.invoke("zb:install"),
});
