import { BrowserWindow, app, globalShortcut, ipcMain, screen } from "electron";
import path from "path";
import * as ich from "../common/ipcChannels";
import { onCreateViewAsync, onDeleteView, onShowPieMenu, onGetDisplayMetrics, onGetViewData, onLogError, onLogInfo, onResizeCaptureAsync, onSetOverlayIgnore, onSetViewRectangle, onSetViewUrl, views, onCallTileContextBehavior } from "../common/listeners";
import * as pre from "../common/logPrefixes";
import { log } from "../common/logger";
import { fitOverlayToWorkarea, getTaskbarBounds } from "../common/mainUtil";

export let mainWindow: BrowserWindow | null = null;
export let hideWindow: BrowserWindow | null = null;
export let overlayWindow: BrowserWindow | null = null;
export let editModeEnabled: boolean = false;
export const viteURL: string = "http://localhost:5173";
const editShortcut: string = "Control+e";
let focused: boolean = false;

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
  // #endregion

  app.once("ready", () => {
    createMainWindow();
    createHideWindow();
    createOverlayWindow();
    screen.on("display-metrics-changed", () => {
      const taskbarBounds = getTaskbarBounds();
      overlayWindow!.webContents.send(
        ich.displayMetricsChanged,
        onGetDisplayMetrics()
      );
      fitOverlayToWorkarea(taskbarBounds);
    });
    globalShortcut.register("Control+t", () => {
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
  mainWindow.webContents.openDevTools({ mode: "right" });
  registerSharedListeners(mainWindow, {
    focus: () => {
      focused = true;
      globalShortcut.register(editShortcut, onEdit);
    },
    blur: () => {
      focused = false;
      globalShortcut.unregister(editShortcut);
    }
  });
}

function createOverlayWindow() {
  overlayWindow =  new BrowserWindow({
    transparent: true,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(app.getAppPath(), "out", "preload", "preload.js"),
      zoomFactor: 1.0
    }
  });
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.setMenu(null);
  overlayWindow.loadURL(`${viteURL}/overlay`);
  //overlayWindow.webContents.openDevTools({ mode: "detach" });
  registerSharedListeners(overlayWindow, {
    blur: () => {
      overlayWindow!.webContents.send(ich.overlayBlur);
      overlayWindow!.setIgnoreMouseEvents(true, { forward: false });
    }
  });
}

function onEdit() {
  const logOptions = { ts: fileName, fn: onEdit.name };
  if (!focused) {
    return;
  }
  if (editModeEnabled) {
    // #region logging
    log.info(logOptions, `${pre.toggling}: Edit Mode on`);
    // #endregion
    mainWindow?.webContents.send(ich.toggleEditMode, false);
    editModeEnabled = false;
    for (const [, value] of views) {
      value.unhide();
    }
  }
  else {
    // #region logging
    log.info(logOptions, `${pre.toggling}: Edit Mode off`);
    // #endregion
    mainWindow?.webContents.send(ich.toggleEditMode, true);
    editModeEnabled = true;
    for (const [, value] of views) {
      value.hide();
    }
  }
}

function registerSharedListeners(window: BrowserWindow, customListeners?: {
  focus?: (...any: unknown[]) => unknown,
  blur?: (...any: unknown[]) => unknown,
  resize?: (...any: unknown[]) => unknown
}) {
  window.on("focus", () => {
    globalShortcut.register("CommandOrControl+0", () => { return; });
    globalShortcut.register("CommandOrControl+plus", () => { return; });
    globalShortcut.register("CommandOrControl+=", () => { return; });
    globalShortcut.register("CommandOrControl+-", () => { return; });
    globalShortcut.register("CommandOrControl+_", () => { return; });
    globalShortcut.register("Control+r", () => { return; });
    customListeners?.focus && customListeners.focus();
  });
  window.on("blur", () => {
    globalShortcut.unregister("CommandOrControl+0");
    globalShortcut.unregister("CommandOrControl+plus");
    globalShortcut.unregister("CommandOrControl+=");
    globalShortcut.unregister("CommandOrControl+-");
    globalShortcut.unregister("CommandOrControl+_");
    globalShortcut.unregister("Control+r");
    customListeners?.blur && customListeners.blur();
  });
  window.on("closed", () => { app.quit(); });
  window.on("resize",() => {
    customListeners?.resize && customListeners.resize();
  });
}

main();
