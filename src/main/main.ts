import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import path from "path";
import * as listeners from "./listeners";

let mainWindow: BrowserWindow | null;
const viteURL = "http://localhost:5173";

function main(): void {
  ipcMain.on("show-split-menu", async (event) => {
    const result = await listeners.onShowSplitMenuAsync(event);
    event.reply("show-split-menu-response", result);
  });

  ipcMain.on("set-browser-view", (event, id, rectangle) => {
    listeners.onSetBrowserView(event, id, rectangle, mainWindow as BrowserWindow);
  });

  onAppReady(createMainWindow);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (mainWindow == null) {
      createMainWindow();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(app.getAppPath(), "out", "preload", "preload.js"),
      zoomFactor: 1.0
    },
    autoHideMenuBar: true,
    width: 1600,
    height: 900
  });

  mainWindow.on("focus", () => {
    globalShortcut.register("CommandOrControl+0", () => { return; });
    globalShortcut.register("CommandOrControl+plus", () => { return; });
    globalShortcut.register("CommandOrControl+=", () => { return; });
    globalShortcut.register("CommandOrControl+-", () => { return; });
    globalShortcut.register("CommandOrControl+_", () => { return; });
  });

  mainWindow.on("blur", () => {
    globalShortcut.unregister("CommandOrControl+0");
    globalShortcut.unregister("CommandOrControl+plus");
    globalShortcut.unregister("CommandOrControl+=");
    globalShortcut.unregister("CommandOrControl+-");
    globalShortcut.unregister("CommandOrControl+_");
  });

  mainWindow.loadURL(viteURL);
  mainWindow.on("closed", () => mainWindow = null);
  mainWindow.webContents.openDevTools();
}

async function onAppReady(
  windowFunction: () => void
): Promise<void> {
  try {
    await app.whenReady();
    windowFunction();
  }
  catch (err) {
    console.error(err);
  }
}

main();
