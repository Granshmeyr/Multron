import { app, BrowserWindow, ipcMain, globalShortcut } from "electron";
import path from "path";
import { onShowSplitMenuAsync, onSetBrowserView, browserViews } from "./listeners";

let mainWindow: BrowserWindow | null;
const viteURL: string = "http://localhost:5173";
const editShortcut: string = "Control+Shift+Alt+e";
let focused: boolean = false;
export let editModeEnabled: boolean = false;

function main(): void {
  ipcMain.on("show-split-menu", async (event) => {
    const result = await onShowSplitMenuAsync(event);
    event.reply("show-split-menu-response", result);
  });

  ipcMain.on("set-browser-view", (event, id, rectangle) => {
    onSetBrowserView(event, id, rectangle, mainWindow as BrowserWindow);
  });

  onAppReady(createMainWindow);

  app.on("ready", () => {
    globalShortcut.register(editShortcut, onEdit);
  });

  app.on("will-quit", () => {
    globalShortcut.unregister(editShortcut);
    globalShortcut.unregisterAll();
  });

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
    width: 1400,
    height: 700
  });

  mainWindow.setMenu(null);

  mainWindow.on("focus", () => {
    focused = true;
    globalShortcut.register("CommandOrControl+0", () => { return; });
    globalShortcut.register("CommandOrControl+plus", () => { return; });
    globalShortcut.register("CommandOrControl+=", () => { return; });
    globalShortcut.register("CommandOrControl+-", () => { return; });
    globalShortcut.register("CommandOrControl+_", () => { return; });
    globalShortcut.register("Control+r", () => { return; });
  });

  mainWindow.on("blur", () => {
    focused = false;
    globalShortcut.unregister("CommandOrControl+0");
    globalShortcut.unregister("CommandOrControl+plus");
    globalShortcut.unregister("CommandOrControl+=");
    globalShortcut.unregister("CommandOrControl+-");
    globalShortcut.unregister("CommandOrControl+_");
    globalShortcut.unregister("Control+r");
  });

  mainWindow.loadURL(viteURL);
  mainWindow.on("closed", () => mainWindow = null);
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

function onEdit() {
  if (!focused) {
    return;
  }

  if (editModeEnabled) {
    mainWindow?.webContents.send("toggle-edit-mode", false);
    editModeEnabled = false;
    for (const id in browserViews) {
      browserViews[id].unhide();
    }
  }
  else {
    mainWindow?.webContents.send("toggle-edit-mode", true);
    editModeEnabled = true;
    for (const id in browserViews) {
      browserViews[id].hide();
    }
  }
}

main();
