import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import * as listener from './listeners';

let mainWindow: BrowserWindow | null;
const viteURL = 'http://localhost:5173';

function main(): void {
  function createWindow() {
    mainWindow = new BrowserWindow({
      webPreferences: {
        preload: path.join(app.getAppPath(),'out', 'preload', 'preload.js')
      },
      width: 1600,
      height: 900
    });
    mainWindow.loadURL(viteURL);
    mainWindow.on('closed', () => mainWindow = null);
    mainWindow.webContents.openDevTools();
  }

  ipcMain.on('show-split-menu', async (event) => {
    const result = await listener.onShowSplitMenuAsync(event);
    event.reply('show-split-menu-response', result);
  });

  runOnAppReady(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (mainWindow == null) {
      createWindow();
    }
  });
}

async function runOnAppReady(
  windowFunction: () => void
): Promise<void> {
  try {
    await app.whenReady();
    windowFunction();
  }
  catch (err) {
    console.error(err);
  }
}

main();
