import { WebContentsView } from "electron";
import { hideWindow, mainWindow } from "../main/main.ts";
import { Chest } from "./interfaces.ts";
import { reparentView } from "./mainUtil.ts";

export const borderPx: Chest<number> = { item: 0 };

export class ViewInstance {
  view: WebContentsView;
  private _rect: Electron.Rectangle = { height: 0, width: 0, x: 0, y: 0 };

  constructor(view: WebContentsView) {
    this.view = view;
  }

  get rect(): Electron.Rectangle {
    return this._rect;
  }
  set rect(value: Electron.Rectangle) {
    this._rect = value;
    this.updateBounds();
  }
  get url(): string { return this.view.webContents.getURL(); }
  set url(value: string) {
    this.view.webContents.loadURL(value);
    if (this.isHidden()) this.unhide();
  }
  isHidden(): boolean {
    return hideWindow!.contentView.children.includes(this.view);
  }
  hide() {
    reparentView(this.view, mainWindow!, hideWindow!);
    this.updateBounds();
  }
  unhide() {
    if (this.url === "") return;
    reparentView(this.view, hideWindow!, mainWindow!);
    this.updateBounds();
  }
  updateBounds() {
    this.view.setBounds({
      ...this.rect,
      x: this.rect.x + borderPx.item,
      y: this.rect.y + borderPx.item
    });
  }
}