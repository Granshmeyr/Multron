import { BrowserView } from "electron";
import { editModeEnabled } from "../main/main";

export class BrowserViewInstance {
  browserView: BrowserView;
  private _rectangle: Electron.Rectangle;
  private hideOffset: number = 10000;

  constructor(browserView: BrowserView) {
    this.browserView = browserView;
    this._rectangle = this.browserView.getBounds();
  }

  set rectangle(value: Electron.Rectangle) {
    if (!isRectangleValid(value)) {
      console.error("Rectangle contains non-integer.");
      this._rectangle = { height: 100, width: 100, x: 0, y: 0 };
    }
    else {
      this._rectangle = value;
    }

    if (!editModeEnabled) {
      this.browserView.setBounds(this.rectangle);
    }
  }

  get rectangle(): Electron.Rectangle {
    return this._rectangle;
  }

  hide() {
    this.browserView.setBounds({
      ...this.rectangle,
      y: this.rectangle.y + this.hideOffset
    });
  }

  unhide() {
    this.browserView.setBounds(this.rectangle);
  }
}

export function isRectangleValid(rectangle: Electron.Rectangle): boolean {
  const numbers: number[] = [rectangle.height, rectangle.width, rectangle.x, rectangle.y];
  for (let i = 1; i < numbers.length; i++) {
    if (!(Number.isInteger(numbers[i]))) {
      console.error("Rectangle contains non-integer.");
      return false;
    }
  }
  return true;
}