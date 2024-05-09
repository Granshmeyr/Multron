import { IpcRendererEvent } from "electron";
import { Direction } from "../../common/enums";
import { DisplayMetrics, IpcListener, Vector2 } from "../../common/interfaces";
import * as ich from "../../common/ipcChannels";

export const editMode: boolean = false;
export const editMargin: number = -20;
export const editShrinkMs: number = 250;

const displayMetricsTracker = new class {
  metrics: DisplayMetrics = {} as DisplayMetrics;
  constructor() {
    (async () => {
      const m = await window.electronAPI.invoke(ich.getDisplayMetrics) as DisplayMetrics;
      this.metrics = m;
    })();
    registerIpcListener(
      ich.displayMetricsChanged,
      {
        uuid: "cf622a4c-60e9-49ca-8f6b-07f142f39637",
        fn: (_e: IpcRendererEvent, m: DisplayMetrics) => { this.metrics = m; },
      }
    );
  }
};
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
// https://stackoverflow.com/questions/1484506/random-color-generator#comment18632055_5365036
export function randomColor() {
  return "#" + ("00000"+(Math.random()*(1<<24)|0).toString(16)).slice(-6);
}
export function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}
export function interpRectangleAsync(
  id: string,
  initialRect: Electron.Rectangle,
  targetRect: Electron.Rectangle,
  ms: number
): Promise<void> {
  return new Promise<void>((resolve) => {
    const startTime = Date.now();
    function update() {
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const t = Math.min(1, elapsedTime / ms);
      const newBounds: Electron.Rectangle = {
        x: Math.round(lerp(initialRect.x, targetRect.x, t)),
        y: Math.round(lerp(initialRect.y, targetRect.y, t)),
        width: Math.round(lerp(initialRect.width, targetRect.width, t)),
        height: Math.round(lerp(initialRect.height, targetRect.height, t))
      };
      window.electronAPI.send(ich.setViewRectangle, id, newBounds);
      if (t < 1) {
        requestAnimationFrame(update);
      }
      else {
        window.electronAPI.send(ich.setViewRectangle, id, targetRect);
        resolve();
      }
    }
    update();
  });
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