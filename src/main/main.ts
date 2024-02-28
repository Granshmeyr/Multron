import { app, BrowserView, BrowserWindow, ipcMain } from "electron";
import path from "path";
import * as listener from "./listeners";

let mainWindow: BrowserWindow | null;
const viteURL = "http://localhost:5173";

function main(): void {
  ipcMain.on("show-split-menu", async (event) => {
    const result = await listener.onShowSplitMenuAsync(event);
    event.reply("show-split-menu-response", result);
  });

  onAppReady(
    () => {
      createMainWindow();
      const browserView = new BrowserView({
        webPreferences: {
          preload: path.join(app.getAppPath(),"out", "preload", "preload.js")
        },
      });
      mainWindow?.addBrowserView(browserView);
      browserView.setBounds({ x: 0, y: 0, width: 800, height: 600 });
      browserView.webContents.loadURL("https://www.instagram.com/p/C3i24COOXKi/");
      browserView.webContents.once("did-finish-load", () => {
        const floatingGUI = `
          const floatingButton = document.createElement('button');
          floatingButton.innerText = 'Click Me';
          floatingButton.style.position = 'fixed';
          floatingButton.style.bottom = '20px';
          floatingButton.style.right = '20px';
          floatingButton.style.zIndex = '1000';
          floatingButton.onclick = function() {
            alert('Button clicked!');
          };
          document.body.appendChild(floatingButton);
        `;
        browserView.webContents.executeJavaScript(floatingGUI);
      });
    }
  );

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (mainWindow == null) {
      createMainWindow();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(app.getAppPath(),"out", "preload", "preload.js")
    },
    width: 1600,
    height: 900
  });
  mainWindow.loadURL(viteURL);
  mainWindow.on("closed", () => mainWindow = null);
  mainWindow.webContents.openDevTools();
}

async function onAppReady(
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
