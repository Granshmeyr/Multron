import { BrowserWindow, app, globalShortcut, ipcMain, screen } from "electron";
import path from "path";
import * as ich from "../common/ipcChannels";
import { onCreateViewAsync, onDeleteView, onGetTaskbarBounds, onGetViewData, onLogError, onLogInfo, onResizeCaptureAsync, onSetViewRectangle, onSetViewUrl, onShowOverlay, views } from "../common/listeners";
import * as pre from "../common/logPrefixes";
import { log } from "../common/logger";

export let mainWindow: BrowserWindow | null = null;
export let hideWindow: BrowserWindow | null = null;
export let overlayWindow: BrowserWindow | null = null;
export let editModeEnabled: boolean = false;
export const viteURL: string = "http://localhost:5173";
const editShortcut: string = "Control+e";
let focused: boolean = false;

const fileName: string = "main.ts";
let display: Electron.Display;

function main(): void {
  // #region events
  const logOptions = { ts: fileName, fn: main.name };
  log.info(logOptions, `${pre.handlingOn}: ${ich.createViewAsync}`);
  ipcMain.handle(ich.createViewAsync, (e, id, options) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.createViewAsync}`);
    return onCreateViewAsync(e, id, mainWindow as BrowserWindow, options);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.setViewRectangle}`);
  ipcMain.on(ich.setViewRectangle, (e, id, rect) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.setViewRectangle}`);
    onSetViewRectangle(e, id, rect);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.setViewUrl}`);
  ipcMain.on(ich.setViewUrl, (e, id, url) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.setViewUrl}`);
    onSetViewUrl(e, id, url);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.logInfo}`);
  ipcMain.on(ich.logInfo, (e, options, message) => {
    //log.info(logOptions, `${pre.eventReceived}: ${ch.logInfo}`);
    onLogInfo(e, options, message);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.logError}`);
  ipcMain.on(ich.logError, (e, options, message) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.logError}`);
    onLogError(e, options, message);
  });
  log.info(logOptions, `${pre.handlingOn}: ${ich.getViewData}`);
  ipcMain.handle(ich.getViewData, () => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.getViewData}`);
    return onGetViewData();
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.deleteView}`);
  ipcMain.on(ich.deleteView, (e, id) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.deleteView}`);
    onDeleteView(e, id);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.resizeCapture}`);
  ipcMain.handle(ich.resizeCapture, async (e, id, rect) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.resizeCapture}`);
    return await onResizeCaptureAsync(e, id, rect);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.showOverlay}`);
  ipcMain.on(ich.showOverlay, (e, pos) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.showOverlay}`);
    onShowOverlay(e, pos);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.getTaskbarBounds}`);
  ipcMain.handle(ich.getTaskbarBounds, () => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.getTaskbarBounds}`);
    return onGetTaskbarBounds();
  });
  // #endregion

  app.once("ready", () => {
    display = screen.getPrimaryDisplay();
    createMainWindow();
    createHideWindow();
    createOverlayWindow();
    globalShortcut.register("Control+t", () => {
      mainWindow!.webContents.send("debug");
    });
  });
  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
}

function createHideWindow() {
  hideWindow = new BrowserWindow({
    x: display.workArea.x,
    y: display.workArea.y,
    height: display.workArea.height,
    width: display.workArea.width,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      zoomFactor: 1.0
    }
  });
  hideWindow.setPosition(0, display.workArea.height - 1);
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
    }
  });
  mainWindow.setMenu(null);
  mainWindow.webContents.loadURL(viteURL);
  // This is the production path
  // mainWindow.loadFile(path.join(app.getAppPath(), "out", "renderer", "index.html"));
  mainWindow.webContents.openDevTools();
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
    x: display.workArea.x,
    y: display.workArea.y,
    width: display.workArea.width,
    height: display.workArea.height,
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
  overlayWindow.webContents.openDevTools({ mode: "detach" });
  registerSharedListeners(overlayWindow);
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
  blur?: (...any: unknown[]) => unknown
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
}

main();
