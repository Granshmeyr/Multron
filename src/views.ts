import { BrowserView, BrowserWindow } from 'electron';

type BoundsFunction = (
    width: number,
    height: number,
) => Electron.Rectangle

export async function updateViewBounds(
    window: BrowserWindow,
    view: BrowserView,
    boundsFunction: BoundsFunction
): Promise<void> {
    let h: number = 100;
    let w: number = 100;

    try {
        const { width, height } = await window.webContents.executeJavaScript(
            `(
                {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            )`
        );
        w = width;
        h = height;
    } catch (error) {
        console.error("Failed to get viewport size:", error);
    }

    view.setBounds(boundsFunction(w, h));
}