import { app, BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null;
const viteURL = 'http://localhost:5173';

function main(): void {
  function createWindow() {
    const preloadPath = 'C:\\Users\\Grindle\\Documents\\Other\\Git\\ElectronSpider\\out\\preload\\preload.js';
    mainWindow = new BrowserWindow({
      webPreferences: {
        preload: preloadPath
      }
    });
    mainWindow.loadURL(viteURL);
    mainWindow.on('closed', () => mainWindow = null);
  }

  initializeApp(createWindow);

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

async function initializeApp(
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
