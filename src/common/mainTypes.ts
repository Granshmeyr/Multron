import { WebContentsView } from "electron";
import * as pre from "./logPrefixes";
import { log } from "./logger";
import { rectToString as rectToString } from "./mainUtil";
import { editModeEnabled } from "../main/main";
import { marginizeRectangle } from "../renderer/common/util";

const fileName: string = "types.ts";

export class ViewInstance {
  view: WebContentsView;
  private _url: string | null = null;
  private _rectangle: Electron.Rectangle = { height: 0, width: 0, x: 0, y: 0 };
  private editMargin: number = 20;
  private editMarginBottom: number = 40;
  private hidden: boolean = false;
  private hiddenDistance: number = 10000;

  constructor(view: WebContentsView) {
    this.view = view;
    this.hide();
  }

  get rectangle(): Electron.Rectangle {
    return this._rectangle;
  }
  set rectangle(value: Electron.Rectangle) {
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.rectangle(set)` };
    this._rectangle = value;
    log.info(logOptions, `${pre.running}: this.${this.updateRectangle.name} from rectangle(set)`);
    this.updateRectangle();
  }
  get url(): string | null { return this._url; }
  set url(value: string) {
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.url(set)` };
    const rect = this.rectangle;
    const unhide: boolean = this.url === null;
    this._url = value;
    this.view.webContents.loadURL(value);
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
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.${this.hide.name}` };
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
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.${this.unhide.name}` };
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
    const logOptions = { ts: fileName, fn: `${ViewInstance.name}.${this.updateRectangle.name}` };
    if (this.hidden && editModeEnabled) {
      log.info(logOptions, `${pre.running}: ${this.view.setBounds.name} with rect ` +
        `"${rectToString(marginRectangle)}"` +
        "with hiddenDistance"
      );
      this.view.setBounds({
        ...marginRectangle,
        y: marginRectangle.y + this.hiddenDistance
      });
      return;
    }
    if (!this.hidden && editModeEnabled) {
      log.info(logOptions, `${pre.running}: ${this.view.setBounds.name} with rect ` + `"${rectToString(marginRectangle)}"`);
      /*const rect: Electron.Rectangle = {
        ...marginRectangle,
        height: marginRectangle.height - this.editMarginBottom
      };
      if (this.view.getBounds() === rect) {
        return;
      }*/
      this.view.setBounds(this._rectangle);
      return;
    }
    if (this.hidden && !editModeEnabled) {
      log.info(logOptions, `${pre.running}: ${this.view.setBounds.name} with rect ` +
      `"${rectToString(marginRectangle)}"` +
      "with hiddenDistance"
      );
      this.view.setBounds({
        ...this.rectangle,
        y: this.rectangle.y + this.hiddenDistance
      });
      return;
    }
    log.info(logOptions, `${pre.running}: ${this.view.setBounds.name} with rect ` + `"${rectToString(this.rectangle)}"`);
    this.view.setBounds(this.rectangle);
  }
}
