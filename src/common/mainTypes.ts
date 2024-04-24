import { WebContentsView } from "electron";
import { hideWindow, mainWindow } from "../main/main";
import * as pre from "./logPrefixes";
import { log } from "./logger";
import { reparentView } from "./mainUtil";

const fileName: string = "types.ts";

export class ViewInstance {
  view: WebContentsView;
  private _url: string | null = null;
  private _rectangle: Electron.Rectangle = { height: 0, width: 0, x: 0, y: 0 };
  private _hidden: boolean = false;

  constructor(view: WebContentsView) {
    this.view = view;
    this.hide();
  }

  get rectangle(): Electron.Rectangle {
    return this._rectangle;
  }
  set rectangle(value: Electron.Rectangle) {
    this._rectangle = value;
    // #region logging
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.rectangle(set)` };
    log.info(
      logOptions,
      `${pre.running}: this.${this.updatePosition.name} from rectangle(set)`
    );
    // #endregion
    this.updatePosition();
  }
  get url(): string | null { return this._url; }
  set url(value: string) {
    const rect = this.rectangle;
    const unhide: boolean = this.url === null;
    this._url = value;
    this.view.webContents.loadURL(value);
    if (unhide) {
      // #region logging
      const logOptions = { ts: fileName, fn: `${ViewInstance.name}.url(set)` };
      log.info(
        logOptions,
        `${pre.running}: this.${this.unhide.name} ` +
        "for view with rect " +
        `"{ height: ${rect.height}, width: ${rect.width},` +
        `x: ${ rect.x }, y: ${ rect.y } }"`);
      // #endregion
      this.unhide();
    }
  }
  get hidden(): boolean { return this._hidden; }
  hide() {
    if (this._hidden) {
      return;
    }
    // #region logging
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.${this.hide.name}` };
    log.info(
      logOptions,
      `${pre.toggling}: hide for view with rectangle ` +
      `"{ height: ${this.rectangle.height}, width: ${this.rectangle.width}, ` +
      `x: ${this.rectangle.x}, y: ${this.rectangle.y} }"`
    );
    // #endregion
    this._hidden = true;
    this.updatePosition();
  }
  unhide() {
    if (
      !this._hidden ||
      this.url === null
    ) {
      return;
    }
    // #region logging
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.${this.unhide.name}` };
    log.info(logOptions, `${pre.toggling}: unhide for view with rectangle ` +
      `"{ height: ${this.rectangle.height}, width: ${this.rectangle.width}, ` +
      `x: ${this.rectangle.x}, y: ${this.rectangle.y} }"`
    );
    // #endregion
    this._hidden = false;
    this.updatePosition();
  }
  updatePosition() {
    if (this.hidden) {
      reparentView(this.view, mainWindow!, hideWindow!);
    }
    else {
      reparentView(this.view, hideWindow!, mainWindow!);
    }
    this.view.setBounds(this.rectangle);
  }
}
