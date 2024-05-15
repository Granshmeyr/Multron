import { BrowserWindow, WebContentsView, screen } from "electron";
import { overlayWindow } from "../main/main.ts";
import { Direction } from "./enums.ts";
import { TaskbarBounds, Vector2 } from "./interfaces.ts";

export function cursorViewportPosition(base: BrowserWindow): Vector2 {
  const cursorPosition = screen.getCursorScreenPoint();
  const windowBounds = base.getContentBounds();

  const relativeX = cursorPosition.x - windowBounds.x;
  const relativeY = cursorPosition.y - windowBounds.y;

  return {x: relativeX, y: relativeY};
}
export function rectToString(rectangle: Electron.Rectangle): string {
  return `{ height: ${rectangle.height}, width: ${rectangle.width}, ` +
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
export function isRectValid(rect: Electron.Rectangle): boolean {
  const numbers = Object.values(rect);
  for (const n of numbers) {
    if (!(Number.isInteger(n))) {
      console.error("Rectangle contains non-integer.");
      return false;
    }
  }
  return true;
}
export function marginizeRect(
  rect: Electron.Rectangle,
  margin: number
): Electron.Rectangle {
  if (!isRectValid(rect)) {
    return { height: 100, width: 100, x: 10, y: 10 };
  }
  return {
    height: Math.ceil(rect.height + (margin * 2)),
    width: Math.ceil(rect.width + (margin * 2)),
    x: Math.ceil(rect.x - margin),
    y: Math.ceil(rect.y - margin)
  };
}
export function normalizeUrl(inputUrl: string): string {
  if (!/^https?:\/\//i.test(inputUrl)) {
    inputUrl = "http://" + inputUrl;
  }

  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch (e) {
    throw new Error("Invalid URL");
  }

  if (!/^www\./i.test(url.hostname)) {
    url.hostname = "www." + url.hostname;
  }
  if (!url.pathname.endsWith("/")) {
    url.pathname += "/";
  }

  return url.toString();
}