import { BrowserView, BrowserWindow, Menu } from "electron";
import * as channels from "../common/channels.ts";
import { Direction } from "../common/enums.ts";
import { BrowserViewInstance } from "../common/types.ts";
import { cursorViewportPosition, marginizeRectangle } from "../common/util.ts";
import { editMargin, editModeEnabled } from "./main.ts";

export const browserViews: Record<string, BrowserViewInstance> = {};

export async function onShowSplitMenuAsync(): Promise<Direction | null> {
  return new Promise<Direction | null>((resolve) => {
    let direction: Direction | null = null;
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
          direction = Direction.Up;
          setFinished(true);
        }
      },
      {
        label: "Split Down",
        click: () => {
          direction = Direction.Down;
          setFinished(true);
        }
      },
      {
        label: "Split Left",
        click: () => {
          direction = Direction.Left;
          setFinished(true);
        }
      },
      {
        label: "Split Right",
        click: () => {
          direction = Direction.Right;
          setFinished(true);
        }
      }
    ];

    const menu: Electron.Menu = Menu.buildFromTemplate(options);
    menu.popup();
    menu.once("menu-will-close", async () => {
      const timeout = new Promise<void>((resolve) => setTimeout(resolve));
      await Promise.race([finished, timeout]);
      resolve(direction);
    });
  });
}

export function onSetBrowserView(
  _event: Electron.IpcMainEvent,
  id: string,
  rectangle: Electron.Rectangle,
  mainWindow: BrowserWindow,
  margin: number = 0
) {
  if (editModeEnabled) {
    margin = editMargin;
  }

  const marginRectangle = marginizeRectangle(rectangle, margin);

  if (!(id in browserViews)) {
    const browserView = new BrowserView({
      webPreferences: {
        enablePreferredSizeMode: true,
        disableHtmlFullscreenWindowResize: true
      }
    });
    browserView.webContents.loadURL("https://www.google.com");
    browserView.webContents.on("context-menu", async () => {
      const position = cursorViewportPosition(mainWindow);
      const direction = await onShowSplitMenuAsync();
      mainWindow.webContents.send(
        channels.browserViewSplit, id, direction, position
      );
    });
    browserView.webContents.on("zoom-changed", (_, zoomDirection) => {
      const currentZoom = browserView.webContents.getZoomLevel();
      function zoomIn() {
        browserView.webContents.setZoomLevel(currentZoom + 0.1);
      }
      function zoomOut() {
        browserView.webContents.setZoomLevel(currentZoom - 0.1);
      }
      (() => {
        switch (zoomDirection) {
        case "in": zoomIn(); return;
        case "out": zoomOut(); return;
        }
      })();
    });
    mainWindow.addBrowserView(browserView);
    browserViews[id] = new BrowserViewInstance(browserView);
    browserViews[id].rectangle = marginRectangle;
    if (editModeEnabled) {
      browserViews[id].currentMargin = margin;
    }
    return;
  }

  browserViews[id].rectangle = marginRectangle;
}
