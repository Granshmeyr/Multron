import { BrowserWindow, Menu } from "electron";
import { Direction } from "../common/enums.ts";

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