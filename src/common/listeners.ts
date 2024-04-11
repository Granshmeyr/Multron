import { BrowserView, BrowserViewConstructorOptions, BrowserWindow, Menu } from "electron";
import * as ch from "./channels.ts";
import { ContextOption, Direction } from "./enums.ts";
import { ContextParams, Vector2 } from "./interfaces.ts";
import { BrowserViewInstance } from "./types.ts";
import { cursorViewportPosition } from "./util.ts";
import { log } from "../common/logger.ts";
import * as pre from "../common/logPrefixes.ts";

export const browserViews: Record<string, BrowserViewInstance> = {};
const fileName: string = "listeners.ts";

export async function onShowContextMenuAsync(): Promise<ContextParams | null> {
  return new Promise<ContextParams | null>((resolve) => {
    let params: ContextParams | null = null;
    const options: Electron.MenuItemConstructorOptions[] = [
      {
        label: "Split Up",
        click: () => { params = { option: ContextOption.Split, direction: Direction.Up }; }
      },
      {
        label: "Split Down",
        click: () => { params = { option: ContextOption.Split, direction: Direction.Down }; }
      },
      {
        label: "Split Left",
        click: () => { params = { option: ContextOption.Split, direction: Direction.Left }; }
      },
      {
        label: "Split Right",
        click: () => { params = { option: ContextOption.Split, direction: Direction.Right }; }
      },
      {
        label: "Set URL",
        click: () => { params = { option: ContextOption.SetUrl, url: "https://www.google.com" }; }
      },
      {
        label: "Delete",
        click: () => { params = { option: ContextOption.Delete }; }
      }
    ];
    const menu: Electron.Menu = Menu.buildFromTemplate(options);
    menu.popup({
      callback: () => { resolve(params); }
    });
  });
}
export async function onCreateViewAsync(
  _event: Electron.IpcMainInvokeEvent,
  id: string,
  mainWindow: BrowserWindow,
  options?: BrowserViewConstructorOptions
): Promise<boolean> {
  const logOptions = { ts: fileName, fn: onCreateViewAsync.name };
  return new Promise<boolean>((resolve) => {
    browserViews[id] = new BrowserViewInstance(new BrowserView(options));
    const view = browserViews[id].browserView;
    view.webContents.on("context-menu", async () => {
      const position: Vector2 = cursorViewportPosition(mainWindow);
      const params: ContextParams | null = await onShowContextMenuAsync();
      mainWindow.webContents.send(
        ch.mainProcessContextMenu, id, params, position
      );
    });
    view.webContents.on("zoom-changed", (_, zoomDirection) => {
      const currentZoom = view.webContents.getZoomLevel();
      function zoomIn() {
        view.webContents.setZoomLevel(currentZoom + 0.1);
      }
      function zoomOut() {
        view.webContents.setZoomLevel(currentZoom - 0.1);
      }
      switch (zoomDirection) {
      case "in": zoomIn(); break;
      case "out": zoomOut(); break;
      }
    });
    const rect: Electron.Rectangle = view.getBounds();
    log.info({ ts: fileName, fn: onCreateViewAsync.name },
      `${pre.addingView}: { height: ${rect.height}, width: ${rect.width}, x: ${rect.x}, y: ${rect.y} } under key ${id}`
    );
    mainWindow.addBrowserView(view);
    resolve(true);

    for (const id in browserViews) {
      log.info(logOptions, `${pre.status}: browserViews has id "${id}"`);
    }
  });
}
export function onSetViewRectangle(
  _event: Electron.IpcMainEvent,
  id: string,
  rectangle: Electron.Rectangle
) {
  const rect = rectangle;
  log.info({ ts: fileName, fn: onSetViewRectangle.name },
    `${pre.setting}: rectangle "{ height: ${rect.height}, width: ${rect.width}, x: ${rect.x}, y: ${rect.y} }" to browserViews[${id}]`
  );
  browserViews[id].rectangle = rect;
}
export function onSetViewUrl(
  _event: Electron.IpcMainEvent,
  id: string,
  url: string
) {
  log.info({ ts: fileName, fn: onSetViewUrl.name },
    `${pre.setting}: url "${url}" to browserViews[${id}]`
  );
  browserViews[id].url = url;
}
export function onLogInfo(
  _event: Electron.IpcMainEvent,
  options: unknown,
  message: string
) {
  log.info(options, message);
}
export function onLogError(
  _event: Electron.IpcMainEvent,
  options: unknown,
  message: string
) {
  log.error(options, message);
}
export function onDoesViewExist(
  _event: Electron.IpcMainInvokeEvent,
  key: string
): boolean {
  const logOptions = { ts: fileName, fn: onDoesViewExist.name };
  if (key in browserViews) {
    log.info(logOptions, `${pre.success}: key "${key}" does exist`);
    return true;
  }
  log.info(logOptions, `${pre.failure}: key "${key}" does not exist`);
  return false;
}