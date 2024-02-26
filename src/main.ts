import { app, BrowserView, BrowserWindow, Menu } from 'electron';
import { main } from './menu';
import { updateViewBounds } from './views';

let window: BrowserWindow | null;

function createWindow(): void {
    const menu = Menu.buildFromTemplate(main);
    Menu.setApplicationMenu(menu);
    window = new BrowserWindow({
        width: 1280,
        height: 720,
        autoHideMenuBar: true,
    });

    window.loadFile('index.html');
    window.on('closed', function () {
        window = null;
    });

    const view1 = new BrowserView();
    const view2 = new BrowserView();

    window.addBrowserView(view1);
    window.addBrowserView(view2);

    updateViewBounds(
        window,
        view1,
        (w, h) => { return { x: 0, y: 0, width: w / 2, height: h }; }
    );
    updateViewBounds(
        window,
        view2,
        (w, h) => { return { x: w / 2, y: 0, width: w / 2, height: h }; }
    );

    view1.webContents.loadURL('https://chat.openai.com/');
    view2.webContents.loadURL('https://www.instagram.com/p/C3i24COOXKi/');
}

app.on('ready', createWindow);
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
app.on('activate', function () {
    if (window === null) createWindow();
});