import { BrowserView } from "electron";
import { marginizeRectangle } from "./util";
import { editMargin } from "../main/main";
import { log } from "../common/logger";
import * as pre from "../common/logPrefixes";

const fileName: string = "types.ts";

export class BrowserViewInstance {
  browserView: BrowserView;
  private _url: string | null = null;
  private _rectangle: Electron.Rectangle= { height: 100, width: 100, x: 0, y: 0 };
  private margin: number = editMargin;
  private hidden: boolean = false;
  private margined: boolean = false;

  constructor(browserView: BrowserView) {
    this.browserView = browserView;
    this.hide();
  }

  get rectangle(): Electron.Rectangle {
    return this._rectangle;
  }
  set rectangle(value: Electron.Rectangle) {
    this._rectangle = value;
    if (this.hidden) {
      return;
    }
    if (this.margined) {
      this.browserView.setBounds(marginizeRectangle(value, this.margin));
    }
    else {
      this.browserView.setBounds(value);
    }
  }
  get url(): string | null { return this._url; }
  set url(value: string) {
    const logOptions = { ts: fileName, fn: `${BrowserViewInstance.name}.url(set)` };
    const rect = this.rectangle;
    const unhide: boolean = this.url === null;
    this._url = value;
    this.browserView.webContents.loadURL(value);
    if (unhide) {
      log.info(
        logOptions,
        `${pre.running}: this.${this.unhide.name} ` +
        "for view with rect " +
        `"{ height: ${rect.height}, width: ${rect.width},` +
        `x: ${ rect.x }, y: ${ rect.y } }"`);
      this.unhide();
    }
  }

  hide() {
    if (this.hidden) {
      return;
    }
    this.browserView.setBounds({
      ...this.rectangle,
      y: this.rectangle.y + 10000
    });
    this.hidden = true;
  }

  unhide() {
    if (
      !this.hidden ||
      this.url === null
    ) {
      return;
    }
    this.browserView.setBounds(this.rectangle);
    this.hidden = false;
  }

  shrink() {
    if (
      this.margined ||
      this.margin === null ||
      !Number.isInteger(this.margin)
    ) {
      return;
    }
    this.rectangle = marginizeRectangle(this.rectangle, this.margin as number);
    this.margined = true;
  }

  unshrink() {
    if (
      !this.margined ||
      this.margin === null
    ) {
      return;
    }
    this.margined = false;
    this.rectangle = marginizeRectangle(this.rectangle, -this.margin);
  }
}
