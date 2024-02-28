import { BrowserWindow, Menu } from 'electron';
import { Split } from '../common/enums.ts';

export async function onShowSplitMenuAsync(
  event: Electron.IpcMainEvent
): Promise<Split | null> {
  return new Promise<Split | null>((resolve) => {
    let selectedSplit: Split | null = null;
    let setFinished: (value: boolean) => void;
    const finished: Promise<boolean> = new Promise<boolean>(
      (resolve) => {
        setFinished = resolve;
      }
    );
    const options: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Split Up',
        click: () => {
          console.log('click function');
          selectedSplit = Split.Up;
          setFinished(true);
        }
      },
      {
        label: 'Split Right',
        click: () => {
          console.log('click function');
          selectedSplit = Split.Right;
          setFinished(true);
        }
      }
    ];
    const menu: Electron.Menu = Menu.buildFromTemplate(options);

    menu.popup({ window: BrowserWindow.fromWebContents(event.sender)! });
    menu.once('menu-will-close', async () => {
      const timeout = new Promise<void>((resolve) => setTimeout(resolve));
      await Promise.race([finished, timeout]);
      console.log('menu closing');
      resolve(selectedSplit);
    });
  });
}