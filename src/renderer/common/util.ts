import { Direction } from "../../common/enums.ts";
import { IpcListener, Rgba, Vector2 } from "../../common/interfaces.ts";
import { displayMetricsTracker } from "./types.ts";

export const editMode: boolean = false;

// https://decipher.dev/30-seconds-of-typescript/docs/throttle/
export function throttle(fn: (...args: unknown[]) => unknown, wait: number = 300) {
  let inThrottle: boolean,
    lastFn: ReturnType<typeof setTimeout>,
    lastTime: number;
  return function (this: unknown, ...args: unknown[]) {
    if (!inThrottle) {
      fn.apply(this, args);
      lastTime = Date.now();
      inThrottle = true;
    } else {
      clearTimeout(lastFn);
      lastFn = setTimeout(function (this: unknown) {
        if (Date.now() - lastTime >= wait) {
          fn.apply(this, args);
          lastTime = Date.now();
        }
      }, Math.max(wait - (Date.now() - lastTime), 0));
    }
  };
}
export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}
export function fpsToMs(fps: number): number {
  return 1000 / fps;
}
export function rectToString(rectangle: Electron.Rectangle): string {
  return `{ height: ${rectangle.height}, width: ${rectangle.width}, ` +
  `x: ${rectangle.x}, y: ${rectangle.y} }`;
}
export function compareRects(
  first: Electron.Rectangle,
  second: Electron.Rectangle
): boolean {
  function rectToArray(rect: Electron.Rectangle): number[] {
    return [rect.height, rect.width, rect.x, rect.y];
  }
  const firstValues: number[] = rectToArray(first);
  const secondValues: number[] = rectToArray(second);
  return firstValues.every((value, i) => value === secondValues[i]);

}
export function registerIpcListener(channel: string, listener: IpcListener) {
  window.electronAPI.on(channel, listener);
}
export function unregisterIpcListener(channel: string, listener: IpcListener) {
  window.electronAPI.removeListener(channel, listener);
}
export function screenToWorkAreaPos(pos: Vector2): Vector2 {
  const t = displayMetricsTracker.metrics.taskbar;
  switch (t.direction) {
  case Direction.Up:    return { x: pos.x, y: pos.y - t.height };
  case Direction.Down:  return pos;
  case Direction.Left:  return { x: pos.x - t.width, y: pos.y };
  case Direction.Right: return pos;
  }
}
export function percentAlongRectY(
  rect: Electron.Rectangle,
  pos: Vector2
): number {
  const windowBorder = (window.outerWidth - window.innerWidth) / 2;
  const offset = (window.outerHeight - window.innerHeight) - windowBorder;
  const mousePosition = pos!.y - (rect.y + window.screenTop + offset);
  return mousePosition / rect.height;
}
export function percentAlongRectX(
  rect: Electron.Rectangle,
  pos: Vector2
): number {
  const windowBorder = (window.outerWidth - window.innerWidth) / 2;
  const mousePosition = pos!.x - (rect.x + window.screenLeft + windowBorder);
  return mousePosition / rect.width;
}
export function getDivRect(div: HTMLDivElement): Electron.Rectangle {
  return {
    x: div.offsetLeft,
    y: div.offsetTop,
    width: div.offsetWidth,
    height: div.offsetHeight
  };
}
export function randomRgba(options?: {
  alpha?: boolean;
  brightness?: number;
  saturation?: number;
}): Rgba {
  function getRandom(multiplier?: number): number {
    const value = Math.floor(Math.random() * 255) + 1;
    return multiplier ? value * multiplier : value;
  }

  function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      }
      h /= 6;
    }

    return [h, s, l];
  }

  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  const r = getRandom(options?.brightness);
  const g = getRandom(options?.brightness);
  const b = getRandom(options?.brightness);

  const [h, s, l] = rgbToHsl(r, g, b);
  const newS = options?.saturation !== undefined ? options.saturation : s;
  const [newR, newG, newB] = hslToRgb(h, newS, l);

  return {
    r: newR,
    g: newG,
    b: newB,
    a: options?.alpha ? Math.random() : 1,
  };
}
export function rgbaAsCss(rgba: Rgba): string {
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}
export function rgbaToHexa(rgba: Rgba): string {
  const { r, g, b, a } = rgba;
  const hex = ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  const alphaHex = Math.round(a * 255).toString(16).padStart(2, "0");
  return `#${hex}${alphaHex}`;
}