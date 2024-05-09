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
export function isRectangleValid(rectangle: Electron.Rectangle): boolean {
  const numbers: number[] = [rectangle.height, rectangle.width, rectangle.x, rectangle.y];
  for (let i = 1; i < numbers.length; i++) {
    if (!(Number.isInteger(numbers[i]))) {
      console.error("Rectangle contains non-integer.");
      return false;
    }
  }
  return true;
}
export function marginizeRectangle(
  rectangle: Electron.Rectangle,
  margin: number
): Electron.Rectangle {
  if (!isRectangleValid(rectangle)) {
    return { height: 100, width: 100, x: 10, y: 10 };
  }
  const newRect =  {
    height: rectangle.height + (margin * 2),
    width: rectangle.width + (margin * 2),
    x: rectangle.x - margin,
    y: rectangle.y - margin
  };
  return newRect;
}