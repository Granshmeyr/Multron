import { BrowserWindow, app, globalShortcut, ipcMain } from "electron";
import path from "path";
import * as ch from "../common/channels";
import { onCreateViewAsync, onDeleteView, onDoesViewExist, onGetViewRectangle, onLogError, onLogInfo, onSetViewRectangle, onSetViewUrl, onShowContextMenuAsync } from "../common/listeners";
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
    log.info(logOptions, `${pre.eventReceived}: ${ch.logInfo}`);
    onLogInfo(event, options, message);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.logError}`);
  ipcMain.on(ch.logError, (event, options, message) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.logError}`);
    onLogError(event, options, message);
  });
  log.info(logOptions, `${pre.handlingOn}: ${ch.doesViewExist}`);
  ipcMain.handle(ch.doesViewExist, (event, key) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.doesViewExist}`);
    return onDoesViewExist(event, key);
  });
  log.info(logOptions, `${pre.listeningOn}: ${ch.deleteView}`);
  ipcMain.on(ch.deleteView, (event, key) => {
    log.info(logOptions, `${pre.eventReceived}: ${ch.deleteView}`);
    onDeleteView(event, key);
  });
  ipcMain.handle(ch.getViewRectangle, (event, key) => {
    return onGetViewRectangle(event, key);
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
      zoomFactor: 1.0,
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
  //mainWindow.loadFile(path.join(app.getAppPath(), "out", "renderer", "index.html"));
  mainWindow.webContents.openDevTools();
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
