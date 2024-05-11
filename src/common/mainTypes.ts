import { WebContentsView } from "electron";
import { hideWindow, mainWindow } from "../main/main";
import { Chest } from "./interfaces";
import { marginizeRect, reparentView } from "./mainUtil";

export const borderPx: Chest<number> = { item: 0 };

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
    this.updateBounds();
  }
  get url(): string | null { return this._url; }
  set url(value: string) {
    const unhide: boolean = this.url === null;
    this._url = value;
    this.view.webContents.loadURL(value);
    if (unhide) {
      this.unhide();
    }
  }
  get hidden(): boolean { return this._hidden; }
  hide() {
    if (this._hidden) {
      return;
    }
    this._hidden = true;
    this.updateBounds();
  }
  unhide() {
    if (
      !this._hidden
    ) {
      return;
    }
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