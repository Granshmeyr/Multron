import { BrowserWindow, Menu, WebContentsView, WebContentsViewConstructorOptions, screen } from "electron";
import * as ich from "../common/ipcChannels.ts";
import * as pre from "../common/logPrefixes.ts";
import { log } from "../common/logger.ts";
import { mainWindow, overlayWindow } from "../main/main.ts";
import { ContextOption, Direction } from "./enums.ts";
import { ContextParams, TaskbarBounds, Vector2, ViewData } from "./interfaces.ts";
import { ViewInstance } from "./mainTypes.ts";
import { cursorViewportPosition } from "./mainUtil.ts";

export const views = new Map<string, ViewInstance>();
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
        click: () => { params = { option: ContextOption.SetUrl, url: "https://www.google.com/" }; }
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
  _e: Electron.IpcMainInvokeEvent,
  id: string,
  window: BrowserWindow,
  options?: WebContentsViewConstructorOptions
): Promise<boolean> {
  const logOptions = { ts: fileName, fn: onCreateViewAsync.name };
  return new Promise<boolean>((resolve) => {
    views.set(id, new ViewInstance(new WebContentsView(options)));
    const view = views.get(id)!.view;
    view.webContents.on("context-menu", async () => {
      const position: Vector2 = cursorViewportPosition(window);
      const params: ContextParams | null = onShowContextMenuAsync();
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
    // #region logging
    log.info({ ts: fileName, fn: onCreateViewAsync.name },
      `${pre.addingView}: { height: ${rect.height}, width: ${rect.width}, x: ${rect.x}, y: ${rect.y} } under key ${id}`
    );
    // #endregion
    window.contentView.addChildView(view);
    resolve(true);

    for (const [key] of views) {
      // #region logging
      log.info(logOptions, `${pre.status}: views has id "${key}"`);
      // #endregion
    }
  });
}
export function onSetViewRectangle(
  _e: Electron.IpcMainEvent,
  id: string,
  rect: Electron.Rectangle
) {
  // #region logging
  log.info({ ts: fileName, fn: onSetViewRectangle.name },
    `${pre.setting}: rectangle "{ height: ${rect.height}, width: ${rect.width}, x: ${rect.x}, y: ${rect.y} }" to views[${id}]`
  );
  // #endregion
  views.get(id)!.rectangle = rect;
}
export function onSetViewUrl(
  _e: Electron.IpcMainEvent,
  id: string,
  url: string
) {
  // #region logging
  log.info({ ts: fileName, fn: onSetViewUrl.name },
    `${pre.setting}: url "${url}" to views[${id}]`
  );
  // #endregion
  views.get(id)!.url = url;
}
export function onLogInfo(
  _e: Electron.IpcMainEvent,
  options: unknown,
  message: string
) {
  log.info(options, message);
}
export function onLogError(
  _e: Electron.IpcMainEvent,
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
  _e: Electron.IpcMainEvent,
  id: string
) {
  const logOptions = { ts: fileName, fn: onDeleteView.name };
  if (!(views.has(id))) {
    // #region logging
    log.error(logOptions, `${pre.missing}: key "${id} does not exist for deletion"`);
    // #endregion
    return;
  }
  // #region logging
  log.info(logOptions, `${pre.deleting}: view for key "${id}"`);
  // #endregion
  mainWindow?.contentView.removeChildView(views.get(id)!.view);
  views.delete(id);
}
export function onGetViewRectangle(
  _e: Electron.IpcMainInvokeEvent,
  id: string
): Electron.Rectangle {
  return views.get(id)!.view.getBounds();
}
export async function onResizeCaptureAsync(
  _e: Electron.IpcMainInvokeEvent,
  id: string,
  rect: Electron.Rectangle
): Promise<Buffer> {
  const instance = views.get(id)!;
  instance.rectangle = rect;
  const image = await instance.view.webContents.capturePage();
  return new Promise<Buffer>((resolve) => {
    resolve(image.toJPEG(80));
  });
}
export function onShowOverlay(
  _e: Electron.IpcMainEvent,
  pos: Vector2
) {
  overlayWindow!.webContents.send(ich.showOverlayResponse, pos);
}
export function onHideOverlay() {
  overlayWindow!.webContents.send(ich.hideOverlayResponse);
}
export function onGetTaskbarBounds(): TaskbarBounds {
  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds;
  const workArea = display.workArea;
  const diffW = bounds.width - workArea.width;
  const diffH = bounds.height - workArea.height;
  let direction: Direction;
  let width: number;
  let height: number;
  if (diffW !== 0) {
    if (workArea.x === 0) {
      direction = Direction.Left;
    }
    else {
      direction = Direction.Right;
    }
    width = diffW;
    height = bounds.height;
  }
  else {
    if (workArea.y === 0) {
      direction = Direction.Up;
    }
    else {
      direction = Direction.Down;
    }
    width = bounds.width;
    height = diffH;
  }
  return {
    direction: direction,
    width: width,
    height: height
  };
}