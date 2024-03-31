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
  mainWindow: BrowserWindow,
  margin: number = 30
) {
  const marginRectangle = createMarginRectangle(rectangle, margin);

  if (!(id in browserViews)) {

    const browserView = new BrowserView();
    browserView.webContents.loadURL("https://www.google.com");
    browserView.setBounds(marginRectangle);
    mainWindow.addBrowserView(browserView);
    browserViews[id] = {
      browserView: browserView,
      rectangle: marginRectangle
    };
    return;
  }

  browserViews[id].browserView.setBounds(marginRectangle);
  browserViews[id].rectangle = marginRectangle;
}

function createMarginRectangle(
  rectangle: Electron.Rectangle,
  margin: number
): Electron.Rectangle {
  const numbers: number[] = [rectangle.height, rectangle.width, rectangle.x, rectangle.y];
  for (let i = 1; i < numbers.length; i++) {
    if (!(Number.isInteger(numbers[i]))) {
      console.error("Rectangle parameter contains invalid values");
      return {
        height: 0,
        width: 0,
        x: 0,
        y: 0
      };
    }
  }

  return {
    height: rectangle.height - (margin * 2),
    width: rectangle.width - (margin * 2),
    x: rectangle.x + margin,
    y: rectangle.y + margin
  };
}