import { app, BrowserView, BrowserWindow } from 'electron';

let mainWindow: BrowserWindow | null;

function createWindow(): void {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
    });

    mainWindow.loadFile('index.html');
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    const view1 = new BrowserView();
    const view2 = new BrowserView();

    mainWindow.addBrowserView(view1);
    mainWindow.addBrowserView(view2);

    async function setViewBounds(mainWindow: BrowserWindow): Promise<void> {
        let h: number = 100;
        let w: number = 100;

        try {
            const { width, height } = await mainWindow.webContents.executeJavaScript(`
                ({
                    width: window.innerWidth,
                    height: window.innerHeight
                })
            `)
            h = height;
            w = width;
        } catch (error) {
            console.error("Failed to get viewport size:", error);
        }

        view1.setBounds({ x: 0, y: 0, width: w / 2, height: h });
        view2.setBounds({ x: w / 2, y: 0, width: w / 2, height: h });
    }
    setViewBounds(mainWindow);

    view1.webContents.loadURL('https://chat.openai.com/');
    view2.webContents.loadURL('https://www.instagram.com/p/C3i24COOXKi/');


}

app.on('ready', createWindow);
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
app.on('activate', function () {
    if (mainWindow === null) createWindow();
});