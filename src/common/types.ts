import { BrowserView } from "electron";
import * as pre from "../common/logPrefixes";
import { log } from "../common/logger";
import { marginizeRectangle, rectangleToString as rectToString } from "./util";
import { editModeEnabled } from "../main/main";

const fileName: string = "types.ts";

export class BrowserViewInstance {
  browserView: BrowserView;
  private _url: string | null = null;
  private _rectangle: Electron.Rectangle= { height: 0, width: 0, x: 0, y: 0 };
  private editMargin: number = 20;
  private hidden: boolean = false;
  private hiddenDistance: number = 10000;

  constructor(browserView: BrowserView) {
    this.browserView = browserView;
    this.hide();
  }

  get rectangle(): Electron.Rectangle {
    return this._rectangle;
  }
  set rectangle(value: Electron.Rectangle) {
    const logOptions = { ts: fileName, fn: `${BrowserViewInstance.name}.rectangle(set)` };
    this._rectangle = value;
    log.info(logOptions, `${pre.running}: this.${this.updateRectangle.name} from rectangle(set)`);
    this.updateRectangle();
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
    const logOptions = { ts: fileName, fn: `${BrowserViewInstance.name}.${this.hide.name}` };
    if (this.hidden) {
      return;
    }
    log.info(logOptions, `${pre.toggling}: hide for view with rectangle ` +
      `"{ height: ${this.rectangle.height}, width: ${this.rectangle.width}, ` +
      `x: ${this.rectangle.x}, y: ${this.rectangle.y} }"`
    );
    this.hidden = true;
    this.updateRectangle();
  }
  unhide() {
    const logOptions = { ts: fileName, fn: `${BrowserViewInstance.name}.${this.unhide.name}` };
    if (
      !this.hidden ||
      this.url === null
    ) {
      return;
    }
    log.info(logOptions, `${pre.toggling}: unhide for view with rectangle ` +
      `"{ height: ${this.rectangle.height}, width: ${this.rectangle.width}, ` +
      `x: ${this.rectangle.x}, y: ${this.rectangle.y} }"`
    );
    this.hidden = false;
    this.updateRectangle();
  }
  updateRectangle() {
    const marginRectangle = marginizeRectangle(this.rectangle, this.editMargin);
    const logOptions = { ts: fileName, fn: `${BrowserViewInstance.name}.${this.updateRectangle.name}` };
    if (this.hidden && editModeEnabled) {
      log.info(logOptions, `${pre.setting}: rectangle ` +
        `"${rectToString(marginRectangle)}"` +
        "with hiddenDistance"
      );
      this.browserView.setBounds({
        ...marginRectangle,
        y: marginRectangle.y + this.hiddenDistance
      });
      return;
    }
    if (!this.hidden && editModeEnabled) {
      log.info(logOptions, `${pre.setting}: rectangle ` + `"${rectToString(marginRectangle)}"`);
      this.browserView.setBounds(marginRectangle);
      return;
    }
    if (this.hidden && !editModeEnabled) {
      log.info(logOptions, `${pre.setting}: rectangle ` +
      `"${rectToString(marginRectangle)}"` +
      "with hiddenDistance"
      );
      this.browserView.setBounds({
        ...this.rectangle,
        y: this.rectangle.y + this.hiddenDistance
      });
      return;
    }
    log.info(logOptions, `${pre.setting}: rectangle ` + `"${rectToString(this.rectangle)}"`);
    this.browserView.setBounds(this.rectangle);
  }
}
