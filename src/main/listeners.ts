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
          console.log("click function");
          direction = Direction.Up;
          setFinished(true);
        }
      },
      {
        label: "Split Down",
        click: () => {
          console.log("click function");
          direction = Direction.Down;
          setFinished(true);
        }
      },
      {
        label: "Split Left",
        click: () => {
          console.log("click function");
          direction = Direction.Left;
          setFinished(true);
        }
      },
      {
        label: "Split Right",
        click: () => {
          console.log("click function");
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
      console.log("menu closing");
      resolve(direction);
    });
  });
}