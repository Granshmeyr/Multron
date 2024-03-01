import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import * as listener from "./listeners";

let mainWindow: BrowserWindow | null;
const viteURL = "http://localhost:5173";

function main(): void {
  ipcMain.on("show-split-menu", async (event) => {
    const result = await listener.onShowSplitMenuAsync(event);
    event.reply("show-split-menu-response", result);
  });

  onAppReady(
    () => {
      createMainWindow();
    }
  );

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
      preload: path.join(app.getAppPath(),"out", "preload", "preload.js")
    },
    autoHideMenuBar: true,
    width: 1600,
    height: 900
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
