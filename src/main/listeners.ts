import { BrowserView, BrowserWindow, Menu } from "electron";
import { Direction } from "../common/enums.ts";
import { BrowserViewInstance, isRectangleValid } from "../common/types.ts";

export const browserViews: Record<string, BrowserViewInstance> = {};

export async function onShowSplitMenuAsync(
  event: Electron.IpcMainEvent
): Promise<Direction | null> {
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
    menu.popup({ window: BrowserWindow.fromWebContents(event.sender)! });
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
  const marginRectangle = marginizeRectangle(rectangle, margin);

  if (!(id in browserViews)) {
    const browserView = new BrowserView({
      webPreferences: {
        enablePreferredSizeMode: true,
        disableHtmlFullscreenWindowResize: true
      }
    });
    browserView.webContents.loadURL("https://www.google.com");
    mainWindow.addBrowserView(browserView);
    browserViews[id] = new BrowserViewInstance(browserView);
    browserViews[id].rectangle = marginRectangle;
    return;
  }

  browserViews[id].rectangle = marginRectangle;
}

function marginizeRectangle(
  rectangle: Electron.Rectangle,
  margin: number
): Electron.Rectangle {
  if (!isRectangleValid(rectangle)) {
    return { height: 100, width: 100, x: 0, y: 0 };
  }

  return {
    height: rectangle.height - (margin * 2),
    width: rectangle.width - (margin * 2),
    x: rectangle.x + margin,
    y: rectangle.y + margin
  };
}