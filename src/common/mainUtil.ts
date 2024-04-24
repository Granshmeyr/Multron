import { BrowserWindow, WebContentsView, screen } from "electron";
import { Vector2 } from "./interfaces";

export function cursorViewportPosition(base: BrowserWindow): Vector2 {
  const cursorPosition = screen.getCursorScreenPoint();
  const windowBounds = base.getContentBounds();

  const relativeX = cursorPosition.x - windowBounds.x;
  const relativeY = cursorPosition.y - windowBounds.y;

  return {x: relativeX, y: relativeY};
}
export function rectToString(rectangle: Electron.Rectangle): string {
  return `{ height: ${rectangle.height}, width: ${rectangle.width},` +
  `x: ${rectangle.x}, y: ${rectangle.y} }`;
}
export function reparentView(
  view: WebContentsView,
  from: BrowserWindow,
  to: BrowserWindow
) {
  if (
    from.contentView.children.includes(view) &&
    !(to.contentView.children.includes(view))
  ) {
    from.contentView.removeChildView(view);
    to.contentView.addChildView(view);
  }
}