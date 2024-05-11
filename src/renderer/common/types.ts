import { IpcRendererEvent } from "electron";
import { DisplayMetrics, ViewData } from "../../common/interfaces";
import * as ich from "../../common/ipcChannels";
import { tiles } from "./nodeTypes";
import { compareRects, fpsToMs, registerIpcListener } from "./util";

export class BgLoader {
  setter: React.Dispatch<React.SetStateAction<string | null>> | null = null;
  private image = new Image();
  loadUrl(url: string) {
    this.image.src = url;
    this.image.onload = () => {
      if (this.setter !== null) {
        this.setter(url);
      }
    };
  }
}
export class ViewRectEnforcer {
  refreshRoot: React.DispatchWithoutAction | null = null;
  private timeout: NodeJS.Timeout | null = null;
  private ms: number;

  constructor(ms: number) {
    this.ms = ms;
  }

  async tickAsync() {
    for (const [id, tile] of tiles) {
      try {
        const rect = tile.getRect();
        if (rect === null) continue;
        const buffer = await window.electronAPI.invoke(
          ich.resizeCapture, id, rect
        ) as Buffer;
        if (buffer.length === 0
          || buffer.every((byte) => { byte === 255; })
        ) {
          continue;
        }
        const blob = new Blob([buffer], { type: "image/jpeg" });
        tiles.get(id)!.bgLoader!.loadUrl(URL.createObjectURL(blob));
      }
      catch (err) {
        console.error(err);
      }
    }
  }
  start() {
    if (this.timeout !== null) {
      return;
    }
    this.timeout = setInterval(
      async () => {
        const valid = await this.integrityCheckAsync() as boolean;
        if (!valid) {
          this.tickAsync();
        }
        else if (this.timeout !== null) {
          clearInterval(this.timeout);
          this.timeout = null;
        }
      },
      this.ms
    );
  }
  private async integrityCheckAsync(): Promise<boolean> {
    const viewData = await window.electronAPI.invoke(ich.getViewData) as Map<string, ViewData>;
    return new Promise<boolean>((resolve) => {
      for (const [id, data] of viewData) {
        const rect = tiles.get(id)!.getRect();
        if (rect === null) {
          continue;
        }
        if (!compareRects(data.rectangle, rect)) {
          resolve(false);
          return;
        }
      }
      resolve(true);
    });
  }
}
export class DisplayMetricsTracker {
  metrics = {} as DisplayMetrics;
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
}

export const displayMetricsTracker = new DisplayMetricsTracker();
export const viewRectEnforcer = new ViewRectEnforcer(fpsToMs(10));
