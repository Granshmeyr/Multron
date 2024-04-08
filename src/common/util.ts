import { Vector2 } from "./interfaces";
import { screen, BrowserWindow } from "electron";

export function marginizeRectangle(
  rectangle: Electron.Rectangle,
  margin: number
): Electron.Rectangle {
  if (!isRectangleValid(rectangle)) {
    return { height: 100, width: 100, x: 10, y: 10 };
  }
  return {
    height: rectangle.height - (margin * 2),
    width: rectangle.width - (margin * 2),
    x: rectangle.x + margin,
    y: rectangle.y + margin
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
export function cursorViewportPosition(browserWindow: BrowserWindow): Vector2 {
  const cursorPosition = screen.getCursorScreenPoint();
  const windowBounds = browserWindow.getContentBounds();

  const relativeX = cursorPosition.x - windowBounds.x;
  const relativeY = cursorPosition.y - windowBounds.y;

  return {x: relativeX, y: relativeY};
}
