import { BrowserWindow, screen } from "electron";
import { Vector2 } from "./interfaces";

export function cursorViewportPosition(browserWindow: BrowserWindow): Vector2 {
  const cursorPosition = screen.getCursorScreenPoint();
  const windowBounds = browserWindow.getContentBounds();

  const relativeX = cursorPosition.x - windowBounds.x;
  const relativeY = cursorPosition.y - windowBounds.y;

  return {x: relativeX, y: relativeY};
}
export function rectangleToString(rectangle: Electron.Rectangle): string {
  return `{ height: ${rectangle.height}, width: ${rectangle.width},` +
  `x: ${rectangle.x}, y: ${rectangle.y} }`;
}