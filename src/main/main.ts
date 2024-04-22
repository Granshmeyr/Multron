import { BrowserWindow, app, globalShortcut, ipcMain } from "electron";
import path from "path";
import * as ch from "../common/channels";
import { onCreateViewAsync, onDeleteView, onGetViewData, onLogError, onLogInfo, onResizeCaptureAsync, onSetViewRectangle, onSetViewUrl, onShowContextMenuAsync } from "../common/listeners";
import * as pre from "../common/logPrefixes";
import { log } from "../common/logger";

export let mainWindow: BrowserWindow | null;
export let editModeEnabled: boolean = false;
export const viteURL: string = "http://localhost:5173";
const editShortcut: string = "Control+e";
let focused: boolean = false;

const fileName: string = "main.ts";

function main(): void {
  const logOptions = { ts: fileName, fn: main.name };
  log.info(logOptions, `${pre.handlingOn}: ${ch.showContextMenuAsync}`);
  ipcMain.handle(ch.showContextMenuAsync, async function () {
    log.info(logOptions, `${pre.eventReceived}: ${ch.showContextMenuAsync}`);
    return onShowContextMenuAsync();
  });
  log.info(logOptions, `${pre.handlingOn}: ${ch.createViewAsync}`);
  ipcMain.handle(ch.createViewAsync, function (event, id, options) {
    log.info(logOptions, `${pre.eventReceived}: ${ch.createViewAsync}`);
    return onCreateViewAsync(event, id, mainWindow as BrowserWindow, options);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.setViewRectangle}`);
  ipcMain.on(ch.setViewRectangle, function (event, id, rectangle) {
    log.info(logOptions, `${pre.eventReceived}: ${ch.setViewRectangle}`);
    onSetViewRectangle(event, id, rectangle);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.setViewUrl}`);
  ipcMain.on(ch.setViewUrl, function (event, id, url) {
    log.info(logOptions, `${pre.eventReceived}: ${ch.setViewUrl}`);
    onSetViewUrl(event, id, url);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.logInfo}`);
  ipcMain.on(ch.logInfo, function (event, options, message) {
    //log.info(logOptions, `${pre.eventReceived}: ${ch.logInfo}`);
    onLogInfo(event, options, message);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.logError}`);
  ipcMain.on(ch.logError, function (event, options, message) {
    log.info(logOptions, `${pre.eventReceived}: ${ch.logError}`);
    onLogError(event, options, message);
  });
  log.info(logOptions, `${pre.handlingOn}: ${ch.getViewData}`);
  ipcMain.handle(ch.getViewData, function () {
    log.info(logOptions, `${pre.eventReceived}: ${ch.getViewData}`);
    return onGetViewData();
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.deleteView}`);
  ipcMain.on(ch.deleteView, function (event, id) {
    log.info(logOptions, `${pre.eventReceived}: ${ch.deleteView}`);
    onDeleteView(event, id);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.resizeCapture}`);
  ipcMain.handle(ch.resizeCapture, async function (event, id, rectangle) {
    log.info(logOptions, `${pre.eventReceived}: ${ch.resizeCapture}`);
    return await onResizeCaptureAsync(event, id, rectangle);
  });

  onAppReady(createMainBaseAndView);

  app.on("ready", function () {
    globalShortcut.register(editShortcut, onEdit);
  });
  app.on("will-quit", function () {
    globalShortcut.unregister(editShortcut);
    globalShortcut.unregisterAll();
  });
  app.on("window-all-closed", function () {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
  app.on("activate", function () {
    if (mainWindow == null) {
      createMainBaseAndView();
    }
  });
}

function createMainBaseAndView() {
  mainWindow = new BrowserWindow({
    useContentSize: true,
    height: 700,
    width: 1400,
    webPreferences: {
      preload: path.join(app.getAppPath(), "out", "preload", "preload.js"),
      zoomFactor: 1.0,
    }
  });
  mainWindow.setMenu(null);
  mainWindow.on("focus", function () {
    focused = true;
    globalShortcut.register("CommandOrControl+0", function () { return; });
    globalShortcut.register("CommandOrControl+plus", function () { return; });
    globalShortcut.register("CommandOrControl+=", function () { return; });
    globalShortcut.register("CommandOrControl+-", function () { return; });
    globalShortcut.register("CommandOrControl+_", function () { return; });
    globalShortcut.register("Control+r", function () { return; });
  });
  mainWindow.on("blur", function () {
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
  mainWindow.on("closed", function () { mainWindow = null; });
}

async function onAppReady(windowFunction: () => void): Promise<void> {
  try {
    await app.whenReady();
    windowFunction();
  }
  catch (err) {
    console.error(err);
  }
}

function onEdit() {
  const logOptions = { ts: fileName, fn: onEdit.name };
  if (!focused) {
    return;
  }
  if (editModeEnabled) {
    log.info(logOptions, `${pre.toggling}: Edit Mode on`);
    mainWindow?.webContents.send(ch.toggleEditMode, false);
    editModeEnabled = false;
  }
  else {
    log.info(logOptions, `${pre.toggling}: Edit Mode off`);
    mainWindow?.webContents.send(ch.toggleEditMode, true);
    editModeEnabled = true;
  }
}

main();
