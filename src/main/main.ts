/* global process */
import { app, BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null;
const viteURL = 'http://localhost:5173';

function createWindow(): void {
  mainWindow = new BrowserWindow();
  mainWindow.loadURL(viteURL);
  mainWindow.on('closed', () => mainWindow = null);
}

function main(): void {
  async function initializeApp(): Promise<void> {
    try {
      await app.whenReady();
      createWindow();
    } catch (err) {
      console.error(err);
    }
  }
  initializeApp();

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

main();
