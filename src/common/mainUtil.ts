import { BrowserWindow, WebContentsView, screen } from "electron";
import { overlayWindow } from "../main/main";
import { Direction } from "./enums";
import { TaskbarBounds, Vector2 } from "./interfaces";

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
export function fitOverlayToWorkarea(bounds: TaskbarBounds) {
  const display = screen.getPrimaryDisplay();
  const [x, y] = (() => {
    switch (bounds.direction) {
    case Direction.Up: return [0, bounds.height];
    case Direction.Down: return [0, 0];
    case Direction.Left: return [bounds.width, 0];
    case Direction.Right: return [0, 0];
    }
  })();
  overlayWindow!.setBounds({
    x: x,
    y: y,
    width: display.workArea.width,
    height: display.workArea.height
  });
}
export function getTaskbarBounds(): TaskbarBounds {
  const display = screen.getPrimaryDisplay();
  const bounds = display.bounds;
  const workArea = display.workArea;
  const diffW = bounds.width - workArea.width;
  const diffH = bounds.height - workArea.height;
  let direction: Direction;
  let width: number;
  let height: number;
  if (diffW !== 0) {
    if (workArea.x === 0) {
      direction = Direction.Right;
    }
    else {
      direction = Direction.Left;
    }
    width = diffW;
    height = bounds.height;
  }
  else {
    if (workArea.y === 0) {
      direction = Direction.Down;
    }
    else {
      direction = Direction.Up;
    }
    width = bounds.width;
    height = diffH;
  }
  return {
    direction: direction,
    width: width,
    height: height
  };
}