import { BrowserWindow, app, globalShortcut, ipcMain, screen } from "electron";
import path from "path";
import { CustomShortcuts, Shortcut } from "../common/interfaces.ts";
import * as ich from "../common/ipcChannels.ts";
import { onCallTileContextBehavior, onCreateViewAsync, onDeleteView, onFocusMainWindow, onGetDisplayMetrics, onGetViewData, onHideAllViews, onRefreshAllViewBounds, onResizeCaptureAsync, onSetOverlayIgnore, onSetViewRectangle, onSetViewUrl, onShowPieMenu, onUnhideAllViews, onUpdateBorderPx } from "../common/listeners.ts";

export let mainWindow: BrowserWindow | null = null;
export let hideWindow: BrowserWindow | null = null;
export let overlayWindow: BrowserWindow | null = null;
export const editModeEnabled: boolean = false;
export const viteURL: string = "http://localhost:5173";

function main(): void {
  // #region events
  ipcMain.handle(ich.createViewAsync, (_, id, options) => {
    return onCreateViewAsync(id, hideWindow!, options);
  });
  ipcMain.on(ich.setViewRectangle, (_, id, rect) => {
    onSetViewRectangle(id, rect);
  });
  ipcMain.on(ich.setViewUrl, (_, id, url) => {
    onSetViewUrl(id, url);
  });
  ipcMain.handle(ich.getViewData, () => {
    return onGetViewData();
  });
  ipcMain.on(ich.deleteView, (_, id) => {
    onDeleteView(id);
  });
  ipcMain.handle(ich.resizeCapture, async (_, id, rect) => {
    return await onResizeCaptureAsync(id, rect);
  });
  ipcMain.on(ich.showPieMenu, (_, nodeId, pos) => {
    onShowPieMenu(nodeId, pos);
  });
  ipcMain.handle(ich.getDisplayMetrics, () => {
    return onGetDisplayMetrics();
  });
  ipcMain.on(ich.setOverlayIgnore, (_, ignoring) => {
    onSetOverlayIgnore(ignoring);
  });
  ipcMain.on(ich.callTileContextBehavior, (_, nodeId, params, pos) => {
    onCallTileContextBehavior(nodeId, params, pos);
  });
  ipcMain.on(ich.updateBorderPx, (_, px) => {
    onUpdateBorderPx(px);
  });
  ipcMain.on(ich.refreshAllViewBounds, () => {
    onRefreshAllViewBounds();
  });
  ipcMain.on(ich.focusMainWindow, () => {
    onFocusMainWindow();
  });
  ipcMain.on(ich.hideAllViews, () => onHideAllViews());
  ipcMain.on(ich.unhideAllViews, () => onUnhideAllViews());
  // #endregion

  app.once("ready", () => {
    createMainWindow();
    createHideWindow();
    createOverlayWindow();
    screen.on("display-metrics-changed", () => {
      overlayWindow!.webContents.send(
        ich.displayMetricsChanged,
        onGetDisplayMetrics()
      );
    });
    globalShortcut.register("CommandOrControl+t", () => {
      mainWindow!.webContents.send("debug");
    });
  });
  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
}

function createHideWindow() {
  const display = screen.getPrimaryDisplay();
  hideWindow = new BrowserWindow({
    x: 0,
    y: display.workArea.height - 1,
    height: display.workArea.height,
    width: display.workArea.width,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      zoomFactor: 1.0
    }
  });
  hideWindow.setIgnoreMouseEvents(true);
  hideWindow.setMenu(null);
  registerSharedListeners(hideWindow);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: "Multron",
    height: 700,
    width: 1400,
    webPreferences: {
      preload: path.join(app.getAppPath(), "out", "preload", "preload.mjs"),
      sandbox: false,
      zoomFactor: 1.0,
      backgroundThrottling: false
    }
  });
  mainWindow.setMenu(null);
  mainWindow.webContents.loadURL(viteURL);
  // This is the production path
  // mainWindow.loadFile(path.join(app.getAppPath(), "out", "renderer", "index.html"));
  const rdtPath: string = "C:\\Users\\Grindle\\AppData\\Local\\Chromium\\User Data\\Default\\Extensions\\fmkadmapgofadopljbjfkapdkoienihi\\5.2.0_0";
  mainWindow.webContents.session.loadExtension(rdtPath);
  mainWindow.webContents.openDevTools({ mode: "detach" });
  registerSharedListeners(mainWindow, {
    focus: [
      {
        accelerator: "CommandOrControl+=",
        callback: () => { mainWindow!.webContents.send(ich.adjustBorderPx, 2); }
      },
      {
        accelerator: "CommandOrControl+-",
        callback: () => { mainWindow!.webContents.send(ich.adjustBorderPx, -2); }
      }
    ]
  });
}

function createOverlayWindow() {
  overlayWindow =  new BrowserWindow({
    transparent: true,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(app.getAppPath(), "out", "preload", "preload.mjs"),
      sandbox: false,
      zoomFactor: 1.0
    }
  });
  overlayWindow.setAlwaysOnTop(true, "pop-up-menu");
  overlayWindow.setBounds({
    x: 0,
    y: 0,
    width: screen.getPrimaryDisplay().bounds.width,
    height: screen.getPrimaryDisplay().bounds.height
  });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setMenu(null);
  overlayWindow.loadURL(`${viteURL}/overlay`);
  overlayWindow.webContents.executeJavaScript("window.windowType = \"ignore\"");
  //overlayWindow.webContents.openDevTools({ mode: "detach" });
  overlayWindow.on("blur", () => {
    overlayWindow!.webContents.send(ich.overlayBlur);
    overlayWindow!.setIgnoreMouseEvents(true, { forward: false });
  });
  registerSharedListeners(overlayWindow);
}

function registerSharedListeners(
  window: BrowserWindow,
  customListeners?: CustomShortcuts
) {
  const defaultShortcuts: Shortcut[] = [
    { accelerator: "CommandOrControl+0",    callback: () => { return; } },
    { accelerator: "CommandOrControl+plus", callback: () => { return; } },
    { accelerator: "CommandOrControl+=",    callback: () => { return; }},
    { accelerator: "CommandOrControl+-",    callback: () => { return; }},
    { accelerator: "CommandOrControl+_",    callback: () => { return; } },
    { accelerator: "CommandOrControl+r",    callback: () => { return; } }
  ];
  window.on("focus", () => {
    for (const s of defaultShortcuts) {
      if (customListeners?.focus === undefined) break;
      if (customListeners.focus.some(v => v.accelerator === s.accelerator)) {
        continue;
      }
      globalShortcut.register(s.accelerator, s.callback);
    }
    if (customListeners?.focus !== undefined) {
      for (const c of customListeners.focus) {
        globalShortcut.register(c.accelerator, c.callback);
      }
    }
  });
  window.on("closed", () => { app.quit(); });
  window.on("blur", () => {
    for (const s of defaultShortcuts) {
      globalShortcut.unregister(s.accelerator);
    }
    if (customListeners !== undefined) {
      for (const key of Object.keys(customListeners)) {
        if (customListeners[key] !== undefined) continue;
        for (const s of customListeners[key]!) {
          globalShortcut.unregister(s.accelerator);
        }
      }
    }
  });
}

main();
