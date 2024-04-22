import { BrowserWindow, Menu, WebContentsView, WebContentsViewConstructorOptions } from "electron";
import * as pre from "../common/logPrefixes.ts";
import { log } from "../common/logger.ts";
import { mainWindow } from "../main/main.ts";
import * as ch from "./channels.ts";
import { ContextOption, Direction } from "./enums.ts";
import { ContextParams, Vector2, ViewData } from "./interfaces.ts";
import { ViewInstance } from "./mainTypes.ts";
import { cursorViewportPosition } from "./mainUtil.ts";

export const views = new Map<string, ViewInstance>();
const fileName: string = "listeners.ts";

export async function onShowContextMenuAsync(): Promise<ContextParams | null> {
  return new Promise<ContextParams | null>(function (resolve) {
    let params: ContextParams | null = null;
    const options: Electron.MenuItemConstructorOptions[] = [
      {
        label: "Split Up",
        click: function () { params = { option: ContextOption.Split, direction: Direction.Up }; }
      },
      {
        label: "Split Down",
        click: function () { params = { option: ContextOption.Split, direction: Direction.Down }; }
      },
      {
        label: "Split Left",
        click: function () { params = { option: ContextOption.Split, direction: Direction.Left }; }
      },
      {
        label: "Split Right",
        click: function () { params = { option: ContextOption.Split, direction: Direction.Right }; }
      },
      {
        label: "Set URL",
        click: function () { params = { option: ContextOption.SetUrl, url: "https://www.google.com/" }; }
      },
      {
        label: "Delete",
        click: function () { params = { option: ContextOption.Delete }; }
      }
    ];
    const menu: Electron.Menu = Menu.buildFromTemplate(options);
    menu.popup({
      callback: function () { resolve(params); }
    });
  });
}
export async function onCreateViewAsync(
  _event: Electron.IpcMainInvokeEvent,
  id: string,
  window: BrowserWindow,
  options?: WebContentsViewConstructorOptions
): Promise<boolean> {
  const logOptions = { ts: fileName, fn: onCreateViewAsync.name };
  return new Promise<boolean>(function (resolve) {
    views.set(id, new ViewInstance(new WebContentsView(options)));
    const view = views.get(id)!.view;
    view.webContents.on("context-menu", async function () {
      const position: Vector2 = cursorViewportPosition(window);
      const params: ContextParams | null = await onShowContextMenuAsync();
      window.webContents.send(
        ch.mainProcessContextMenu, id, params, position
      );
    });
    view.webContents.on("zoom-changed", function (_, zoomDirection) {
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
    window.contentView.addChildView(view);
    resolve(true);

    for (const [key] of views) {
      log.info(logOptions, `${pre.status}: views has id "${key}"`);
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
    `${pre.setting}: rectangle "{ height: ${rect.height}, width: ${rect.width}, x: ${rect.x}, y: ${rect.y} }" to views[${id}]`
  );
  views.get(id)!.rectangle = rect;
}
export function onSetViewUrl(
  _event: Electron.IpcMainEvent,
  id: string,
  url: string
) {
  log.info({ ts: fileName, fn: onSetViewUrl.name },
    `${pre.setting}: url "${url}" to views[${id}]`
  );
  views.get(id)!.url = url;
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
export function onGetViewData(): Map<string, ViewData> {
  const data = new Map<string, ViewData>();
  for (const [id, instance] of views) {
    data.set(id, {
      url: instance.url,
      rectangle: instance.rectangle
    });
  }
  return data;
}
export function onDeleteView(
  _event: Electron.IpcMainEvent,
  id: string
) {
  const logOptions = { ts: fileName, fn: onDeleteView.name };
  if (!(views.has(id))) {
    log.error(logOptions, `${pre.missing}: key "${id} does not exist for deletion"`);
    return;
  }
  log.info(logOptions, `${pre.deleting}: view for key "${id}"`);
  mainWindow?.contentView.removeChildView(views.get(id)!.view);
  views.delete(id);
}
export function onGetViewRectangle(
  _event: Electron.IpcMainInvokeEvent,
  id: string
): Electron.Rectangle {
  return views.get(id)!.view.getBounds();
}
export async function onResizeCaptureAsync(
  _event: Electron.IpcMainInvokeEvent,
  id: string,
  rectangle: Electron.Rectangle
): Promise<Buffer> {
  const instance = views.get(id)!;
  instance.rectangle = rectangle;
  const image = await instance.view.webContents.capturePage();
  return new Promise<Buffer>(function (resolve) {
    resolve(image.toJPEG(80));
  });
}