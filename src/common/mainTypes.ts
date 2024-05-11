import { WebContentsView } from "electron";
import { hideWindow, mainWindow } from "../main/main";
import { Chest } from "./interfaces";
import * as pre from "./logPrefixes";
import { log } from "./logger";
import { marginizeRect, reparentView } from "./mainUtil";

export const borderPx: Chest<number> = { item: 0 };
const fileName: string = "types.ts";

export class ViewInstance {
  view: WebContentsView;
  private _url: string | null = null;
  private _rect: Electron.Rectangle = { height: 0, width: 0, x: 0, y: 0 };
  private _hidden: boolean = false;

  constructor(view: WebContentsView) {
    this.view = view;
    this.hide();
  }

  get rect(): Electron.Rectangle {
    return this._rect;
  }
  set rect(value: Electron.Rectangle) {
    this._rect = value;
    // #region logging
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.rectangle(set)` };
    log.info(
      logOptions,
      `${pre.running}: this.${this.updateBounds.name} from rectangle(set)`
    );
    // #endregion
    this.updateBounds();
  }
  get url(): string | null { return this._url; }
  set url(value: string) {
    const rect = this.rect;
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
      `"{ height: ${this.rect.height}, width: ${this.rect.width}, ` +
      `x: ${this.rect.x}, y: ${this.rect.y} }"`
    );
    // #endregion
    this._hidden = true;
    this.updateBounds();
  }
  unhide() {
    if (
      !this._hidden
    ) {
      return;
    }
    // #region logging
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.${this.unhide.name}` };
    log.info(logOptions, `${pre.toggling}: unhide for view with rectangle ` +
      `"{ height: ${this.rect.height}, width: ${this.rect.width}, ` +
      `x: ${this.rect.x}, y: ${this.rect.y} }"`
    );
    // #endregion
    this._hidden = false;
    this.updateBounds();
  }
  updateBounds() {
    if (this.hidden) {
      reparentView(this.view, mainWindow!, hideWindow!);
    }
    else {
      reparentView(this.view, hideWindow!, mainWindow!);
    }
    const b = marginizeRect(this.rect, -borderPx.item);
    this.view.setBounds(b);
  }
}