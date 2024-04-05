import { BrowserView } from "electron";
import { isRectangleValid, marginizeRectangle } from "./util";

export class BrowserViewInstance {
  browserView: BrowserView;
  currentMargin: number | null = null;
  private _rectangle: Electron.Rectangle;

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

    this.browserView.setBounds(this.rectangle);
  }

  get rectangle(): Electron.Rectangle {
    return this._rectangle;
  }

  hide() {
    this.browserView.setBounds({
      ...this.rectangle,
      y: this.rectangle.y + 10000
    });
  }

  unhide() {
    this.browserView.setBounds(this.rectangle);
  }

  shrink(margin: number) {
    if (!Number.isInteger(margin)) {
      console.error("Margin must be an integer");
      return;
    }
    const marginRectangle = marginizeRectangle(this._rectangle, margin);
    this.browserView.setBounds(marginizeRectangle(marginRectangle, margin));
    this.rectangle = marginRectangle;
    this.currentMargin = margin;
  }

  unshrink() {
    if (this.currentMargin === null) {
      console.error("Rectangle is not marginized");
      return;
    }
    const marginRectangle = marginizeRectangle(this._rectangle, -this.currentMargin);
    this.browserView.setBounds(marginRectangle);
    this.rectangle = marginRectangle;
    this.currentMargin = null;
  }
}
