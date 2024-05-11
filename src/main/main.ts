import { BrowserWindow, app, globalShortcut, ipcMain, screen } from "electron";
import path from "path";
import { CustomShortcuts, Shortcut } from "../common/interfaces";
import * as ich from "../common/ipcChannels";
import { onCallTileContextBehavior, onCreateViewAsync, onDeleteView, onFocusMainWindow, onGetDisplayMetrics, onGetViewData, onLogError, onLogInfo, onRefreshAllViewBounds, onResizeCaptureAsync, onSetOverlayIgnore, onSetViewRectangle, onSetViewUrl, onShowPieMenu, onUpdateBorderPx } from "../common/listeners";
import * as pre from "../common/logPrefixes";
import { log } from "../common/logger";

export let mainWindow: BrowserWindow | null = null;
export let hideWindow: BrowserWindow | null = null;
export let overlayWindow: BrowserWindow | null = null;
export const editModeEnabled: boolean = false;
export const viteURL: string = "http://localhost:5173";

const fileName: string = "main.ts";

function main(): void {
  // #region events
  const logOptions = { ts: fileName, fn: main.name };
  log.info(logOptions, `${pre.handlingOn}: ${ich.createViewAsync}`);
  ipcMain.handle(ich.createViewAsync, (_, id, options) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.createViewAsync}`);
    return onCreateViewAsync(id, mainWindow as BrowserWindow, options);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.setViewRectangle}`);
  ipcMain.on(ich.setViewRectangle, (_, id, rect) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.setViewRectangle}`);
    onSetViewRectangle(id, rect);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.setViewUrl}`);
  ipcMain.on(ich.setViewUrl, (_, id, url) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.setViewUrl}`);
    onSetViewUrl(id, url);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.logInfo}`);
  ipcMain.on(ich.logInfo, (_, options, message) => {
    //log.info(logOptions, `${pre.eventReceived}: ${ch.logInfo}`);
    onLogInfo(options, message);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.logError}`);
  ipcMain.on(ich.logError, (_, options, message) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.logError}`);
    onLogError(options, message);
  });
  log.info(logOptions, `${pre.handlingOn}: ${ich.getViewData}`);
  ipcMain.handle(ich.getViewData, () => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.getViewData}`);
    return onGetViewData();
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.deleteView}`);
  ipcMain.on(ich.deleteView, (_, id) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.deleteView}`);
    onDeleteView(id);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.resizeCapture}`);
  ipcMain.handle(ich.resizeCapture, async (_, id, rect) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.resizeCapture}`);
    return await onResizeCaptureAsync(id, rect);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.showPieMenu}`);
  ipcMain.on(ich.showPieMenu, (_, nodeId, pos) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.showPieMenu}`);
    onShowPieMenu(nodeId, pos);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.getDisplayMetrics}`);
  ipcMain.handle(ich.getDisplayMetrics, () => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.getDisplayMetrics}`);
    return onGetDisplayMetrics();
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.setOverlayIgnore}`);
  ipcMain.on(ich.setOverlayIgnore, (_, ignoring) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.setOverlayIgnore}`);
    onSetOverlayIgnore(ignoring);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.callTileContextBehavior}`);
  ipcMain.on(ich.callTileContextBehavior, (_, nodeId, params, pos) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.callTileContextBehavior}`);
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
    height: 700,
    width: 1400,
    webPreferences: {
      preload: path.join(app.getAppPath(), "out", "preload", "preload.js"),
      zoomFactor: 1.0,
      backgroundThrottling: false
    }
  });
  mainWindow.setMenu(null);
  mainWindow.webContents.loadURL(viteURL);
  // This is the production path
  // mainWindow.loadFile(path.join(app.getAppPath(), "out", "renderer", "index.html"));
  mainWindow.webContents.openDevTools({ mode: "detach" });
  registerSharedListeners(mainWindow, {
    focus: [
      {
        accelerator: "CommandOrControl+-",
        callback: () => { mainWindow!.webContents.send(ich.adjustBorderPx, 2); }
      },
      {
        accelerator: "CommandOrControl+=",
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
      preload: path.join(app.getAppPath(), "out", "preload", "preload.js"),
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
