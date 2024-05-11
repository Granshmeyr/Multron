import { BrowserWindow, Menu, WebContentsView, WebContentsViewConstructorOptions, screen } from "electron";
import * as ich from "../common/ipcChannels.ts";
import { mainWindow, overlayWindow } from "../main/main.ts";
import { ContextOption, Direction } from "./enums.ts";
import { ContextParams, DisplayMetrics, Vector2, ViewData } from "./interfaces.ts";
import { ViewInstance, borderPx } from "./mainTypes.ts";
import { cursorViewportPosition, getTaskbarBounds } from "./mainUtil.ts";

export const views = new Map<string, ViewInstance>();

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
  id: string,
  window: BrowserWindow,
  options?: WebContentsViewConstructorOptions
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    views.set(id, new ViewInstance(new WebContentsView(options)));
    const view = views.get(id)!.view;
    view.webContents.on("context-menu", async () => {
      const position: Vector2 = cursorViewportPosition(window);
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
    window.contentView.addChildView(view);
    resolve(true);
  });
}
export function onSetViewRectangle(
  id: string,
  rect: Electron.Rectangle
) {
  views.get(id)!.rect = rect;
}
export function onSetViewUrl(
  id: string,
  url: string
) {
  views.get(id)!.url = url;
}
export function onGetViewData(): Map<string, ViewData> {
  const data = new Map<string, ViewData>();
  for (const [id, instance] of views) {
    data.set(id, {
      url: instance.url,
      rectangle: instance.rect
    });
  }
  return data;
}
export function onDeleteView(id: string) {
  if (!(views.has(id))) {
    return;
  }
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
  id: string,
  rect: Electron.Rectangle
): Promise<Buffer> {
  const instance = views.get(id)!;
  instance.rect = rect;
  const image = await instance.view.webContents.capturePage();
  return new Promise<Buffer>((resolve) => {
    resolve(image.toJPEG(80));
  });
}
export function onShowPieMenu(
  nodeId: string,
  pos: Vector2
) {
  overlayWindow!.setIgnoreMouseEvents(false, { forward: true });
  overlayWindow!.webContents.send(ich.showPieMenuCC, nodeId, pos);
  overlayWindow!.focus();
}
export function onGetDisplayMetrics(): DisplayMetrics {
  const d = screen.getPrimaryDisplay();
  return {
    screen: {
      bounds: d.bounds,
      workArea: d.workArea
    },
    taskbar: getTaskbarBounds()
  };
}
export function onSetOverlayIgnore(ignoring: boolean) {
  overlayWindow!.setIgnoreMouseEvents(ignoring, { forward: true });
}
export function onCallTileContextBehavior(
  nodeId: string,
  params: ContextParams,
  pos?: Vector2
) {
  mainWindow!.webContents.send(ich.callTileContextBehaviorCC, nodeId, params, pos);
}
export function onUpdateBorderPx(px: number) {
  borderPx.item = px;
}
export function onRefreshAllViewBounds() {
  for (const [, v] of views) v.updateBounds();
}
export function onFocusMainWindow() {
  mainWindow!.focus();
}