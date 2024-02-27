import { BrowserWindow, Menu } from 'electron';

export function onShowSplitMenu(event: Electron.IpcMainEvent): void {
  const template = [
    { label: 'Split Right', click: () => console.log('Option  1 clicked') },
    { label: 'Split Down', click: () => console.log('Option  2 clicked') },
  ];

  const menu = Menu.buildFromTemplate(template);
  menu.popup({ window: BrowserWindow.fromWebContents(event.sender)! });
}