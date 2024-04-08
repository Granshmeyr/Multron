import { BrowserView, BrowserViewConstructorOptions, BrowserWindow, Menu } from "electron";
import * as channels from "./channels.ts";
import { ContextOption, Direction } from "./enums.ts";
import { ContextParams, Vector2 } from "./interfaces.ts";
import { BrowserViewInstance } from "./types.ts";
import { cursorViewportPosition } from "./util.ts";
import { logger } from "../common/logger.ts";

export const browserViews: Record<string, BrowserViewInstance> = {};

export async function onShowContextMenuAsync(): Promise<ContextParams | null> {
  return new Promise<ContextParams | null>((resolve) => {
    let params: ContextParams | null = null;
    let setFinished: (value: boolean) => void;

    const finished: Promise<boolean> = new Promise<boolean>(
      (resolve) => {
        setFinished = resolve;
      }
    );

    const options: Electron.MenuItemConstructorOptions[] = [
      {
        label: "Split Up",
        click: () => {
          params = { option: ContextOption.Split, direction: Direction.Up };
          setFinished(true);
        }
      },
      {
        label: "Split Down",
        click: () => {
          params = { option: ContextOption.Split, direction: Direction.Down };
          setFinished(true);
        }
      },
      {
        label: "Split Left",
        click: () => {
          params = { option: ContextOption.Split, direction: Direction.Left };
          setFinished(true);
        }
      },
      {
        label: "Split Right",
        click: () => {
          params = { option: ContextOption.Split, direction: Direction.Right };
          setFinished(true);
        }
      },
      {
        label: "Set URL",
        click: () => {
          params = { option: ContextOption.SetUrl, url: "https://www.google.com" };
          setFinished(true);
        }
      },
      {
        label: "Delete",
        click: () => {
          params = { option: ContextOption.Delete };
          setFinished(true);
        }
      }
    ];

    const menu: Electron.Menu = Menu.buildFromTemplate(options);
    menu.popup();
    menu.once("menu-will-close", async () => {
      const timeout = new Promise<void>((resolve) => setTimeout(resolve));
      await Promise.race([finished, timeout]);
      resolve(params);
    });
  });
}

export function onCreateView(
  _event: Electron.IpcMainEvent,
  id: string,
  mainWindow: BrowserWindow,
  options?: BrowserViewConstructorOptions
) {
  browserViews[id] = new BrowserViewInstance(new BrowserView(options));
  const view = browserViews[id].browserView;
  view.webContents.on("context-menu", async () => {
    const position: Vector2 = cursorViewportPosition(mainWindow);
    const params: ContextParams | null = await onShowContextMenuAsync();
    mainWindow.webContents.send(
      channels.mainProcessContextMenu, id, params, position
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
  mainWindow.addBrowserView(view);
}

export function onSetViewRectangle(
  _event: Electron.IpcMainEvent,
  id: string,
  rectangle: Electron.Rectangle
) {
  browserViews[id].rectangle = rectangle;
}

export function onSetViewUrl(
  _event: Electron.IpcMainEvent,
  id: string,
  url: string
) {
  browserViews[id].url = url;
}

export function onLogInfo(
  _event: Electron.IpcMainEvent,
  message: string
) {
  logger.info(message);
}

export function onLogError(
  _event: Electron.IpcMainEvent,
  message: string
) {
  logger.error(message);
}