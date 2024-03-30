import { BrowserView, BrowserWindow, Menu } from "electron";
import { Direction } from "../common/enums.ts";
import { BrowserViewData } from "../common/interfaces.ts";

const browserViews: Record<string, BrowserViewData> = {};

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
  mainWindow: BrowserWindow
) {
  if (!(id in browserViews)) {
    const browserView = new BrowserView();
    browserView.webContents.loadURL("https://www.google.com");
    browserView.setBounds({
      height: Math.floor(rectangle.height / 1.16),
      width: Math.floor(rectangle.width / 1.6),
      x: rectangle.x + 30,
      y: rectangle.y + 30
    });
    mainWindow.addBrowserView(browserView);
    browserViews[id] = {
      browserView: browserView,
      rectangle: rectangle
    };
  }
}