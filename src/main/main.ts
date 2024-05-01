import { BrowserWindow, app, globalShortcut, ipcMain, screen } from "electron";
import path from "path";
import * as ich from "../common/ipcChannels";
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
  log.info(logOptions, `${pre.handlingOn}: ${ich.showContextMenuAsync}`);
  ipcMain.handle(ich.showContextMenuAsync, async () => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.showContextMenuAsync}`);
    return onShowContextMenuAsync();
  });
  log.info(logOptions, `${pre.handlingOn}: ${ich.createViewAsync}`);
  ipcMain.handle(ich.createViewAsync, (event, id, options) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.createViewAsync}`);
    return onCreateViewAsync(event, id, mainWindow as BrowserWindow, options);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.setViewRectangle}`);
  ipcMain.on(ich.setViewRectangle, (event, id, rectangle) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.setViewRectangle}`);
    onSetViewRectangle(event, id, rectangle);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.setViewUrl}`);
  ipcMain.on(ich.setViewUrl, (event, id, url) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.setViewUrl}`);
    onSetViewUrl(event, id, url);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.logInfo}`);
  ipcMain.on(ich.logInfo, (event, options, message) => {
    //log.info(logOptions, `${pre.eventReceived}: ${ch.logInfo}`);
    onLogInfo(event, options, message);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.logError}`);
  ipcMain.on(ich.logError, (event, options, message) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.logError}`);
    onLogError(event, options, message);
  });
  log.info(logOptions, `${pre.handlingOn}: ${ich.getViewData}`);
  ipcMain.handle(ich.getViewData, () => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.getViewData}`);
    return onGetViewData();
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.deleteView}`);
  ipcMain.on(ich.deleteView, (event, id) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.deleteView}`);
    onDeleteView(event, id);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ich.resizeCapture}`);
  ipcMain.handle(ich.resizeCapture, async (event, id, rectangle) => {
    log.info(logOptions, `${pre.eventReceived}: ${ich.resizeCapture}`);
    return await onResizeCaptureAsync(event, id, rectangle);
  });
  // #endregion

  app.once("ready", () => {
    createMainWindow();
    createHideWindow();
    globalShortcut.register(editShortcut, onEdit);
    globalShortcut.register("Control+t", () => {
      mainWindow!.webContents.send("debug");
    });
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

main();
