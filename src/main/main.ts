import { BrowserWindow, app, globalShortcut, ipcMain, screen } from "electron";
import path from "path";
import * as ch from "../common/channels";
import { onCreateViewAsync, onDeleteView, onGetViewData, onLogError, onLogInfo, onResizeCaptureAsync, onSetViewRectangle, onSetViewUrl, onShowContextMenuAsync, views } from "../common/listeners";
import * as pre from "../common/logPrefixes";
import { log } from "../common/logger";

export let mainWindow: BrowserWindow | null;
export let hideWindow: BrowserWindow | null;
export let editModeEnabled: boolean = false;
export const viteURL: string = "http://localhost:5173";
const editShortcut: string = "Control+e";
let focused: boolean = false;

const fileName: string = "main.ts";

function main(): void {
  // #region events
  const logOptions = { ts: fileName, fn: main.name };
  log.info(logOptions, `${pre.handlingOn}: ${ch.showContextMenuAsync}`);
  ipcMain.handle(ch.showContextMenuAsync, async () => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.showContextMenuAsync}`);
    return onShowContextMenuAsync();
  });
  log.info(logOptions, `${pre.handlingOn}: ${ch.createViewAsync}`);
  ipcMain.handle(ch.createViewAsync, (event, id, options) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.createViewAsync}`);
    return onCreateViewAsync(event, id, mainWindow as BrowserWindow, options);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.setViewRectangle}`);
  ipcMain.on(ch.setViewRectangle, (event, id, rectangle) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.setViewRectangle}`);
    onSetViewRectangle(event, id, rectangle);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.setViewUrl}`);
  ipcMain.on(ch.setViewUrl, (event, id, url) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.setViewUrl}`);
    onSetViewUrl(event, id, url);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.logInfo}`);
  ipcMain.on(ch.logInfo, (event, options, message) => {
    //log.info(logOptions, `${pre.eventReceived}: ${ch.logInfo}`);
    onLogInfo(event, options, message);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.logError}`);
  ipcMain.on(ch.logError, (event, options, message) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.logError}`);
    onLogError(event, options, message);
  });
  log.info(logOptions, `${pre.handlingOn}: ${ch.getViewData}`);
  ipcMain.handle(ch.getViewData, () => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.getViewData}`);
    return onGetViewData();
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.deleteView}`);
  ipcMain.on(ch.deleteView, (event, id) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.deleteView}`);
    onDeleteView(event, id);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.resizeCapture}`);
  ipcMain.handle(ch.resizeCapture, async (event, id, rectangle) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.resizeCapture}`);
    return await onResizeCaptureAsync(event, id, rectangle);
  });
  // #endregion

  app.once("ready", () => {
    createMainWindow();
    createHideWindow();
    globalShortcut.register(editShortcut, onEdit);
  });
  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });
}

function createHideWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  hideWindow = new BrowserWindow({
    height: height,
    width: width,
    transparent: true,
    frame: false,
    skipTaskbar: true,
    webPreferences: {
      zoomFactor: 1.0
    }
  });
  hideWindow.setPosition(0, height - 1);
  hideWindow.setIgnoreMouseEvents(true);
  hideWindow.setMenu(null);
  hideWindow.on("focus", () => {
    focused = true;
    globalShortcut.register("CommandOrControl+0", () => { return; });
    globalShortcut.register("CommandOrControl+plus", () => { return; });
    globalShortcut.register("CommandOrControl+=", () => { return; });
    globalShortcut.register("CommandOrControl+-", () => { return; });
    globalShortcut.register("CommandOrControl+_", () => { return; });
    globalShortcut.register("Control+r", () => { return; });
  });
  hideWindow.on("blur", () => {
    focused = false;
    globalShortcut.unregister("CommandOrControl+0");
    globalShortcut.unregister("CommandOrControl+plus");
    globalShortcut.unregister("CommandOrControl+=");
    globalShortcut.unregister("CommandOrControl+-");
    globalShortcut.unregister("CommandOrControl+_");
    globalShortcut.unregister("Control+r");
  });
  hideWindow.on("closed", () => { app.quit(); });
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
  mainWindow.webContents.loadURL(viteURL);
  //mainWindow.loadFile(path.join(app.getAppPath(), "out", "renderer", "index.html"));
  mainWindow.webContents.openDevTools();
  mainWindow.on("closed", () => { app.quit(); });
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
    mainWindow?.webContents.send(ch.toggleEditMode, false);
    editModeEnabled = false;
    for (const [, value] of views) {
      value.unhide();
    }
  }
  else {
    // #region logging
    log.info(logOptions, `${pre.toggling}: Edit Mode off`);
    // #endregion
    mainWindow?.webContents.send(ch.toggleEditMode, true);
    editModeEnabled = true;
    for (const [, value] of views) {
      value.hide();
    }
  }
}

main();
