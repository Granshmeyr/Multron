import { WebContentsView } from "electron";
import { hideWindow, mainWindow } from "../main/main.ts";
import { Chest } from "./interfaces.ts";
import { normalizeUrl, reparentView } from "./mainUtil.ts";

export const borderPx: Chest<number> = { item: 0 };
export const titlebarPx: Chest<number> = { item: 0 };

export class ViewInstance {
  view: WebContentsView;
  nodeId: string;
  private _rect: Electron.Rectangle = { height: 0, width: 0, x: 0, y: 0 };

  constructor(view: WebContentsView, nodeId: string) {
    this.view = view;
    this.nodeId = nodeId;
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
    const url = normalizeUrl(value);
    this.view.webContents.loadURL(url);
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
      y: this.rect.y + titlebarPx.item
    });
  }
}