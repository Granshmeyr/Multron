import { IpcRendererEvent } from "electron";
import { DisplayMetrics, ViewData } from "../../common/interfaces.ts";
import * as ich from "../../common/ipcChannels.ts";
import { TileNode } from "./nodeTypes.tsx";
import { compareRects, registerIpcListener } from "./util.ts";

export class BgLoader {
  setter: React.Dispatch<React.SetStateAction<string | null>> | null = null;
  private image = new Image();
  private tileNode: TileNode;

  constructor(tileNode: TileNode) {
    this.tileNode = tileNode;
  }

  loadUrl(url: string) {
    this.image.src = url;
    this.image.onload = () => {
      if (this.setter !== null) {
        this.tileNode.bg = url;
        this.setter(url);
      }
    };
  }
}
export class ViewRectEnforcer {
  tileNode: TileNode;
  refreshRoot: React.DispatchWithoutAction | null = null;
  private timeout: NodeJS.Timeout | null = null;
  private ms: number;

  constructor(tileNode: TileNode, ms: number) {
    this.tileNode = tileNode;
    this.ms = ms;
  }

  async tickAsync() {
    try {
      const rect = this.tileNode.getRect();
      if (rect === null) return;
      const buffer = await window.electronAPI.invoke(
        ich.resizeCapture, this.tileNode.nodeId, rect
      ) as Buffer;
      if (buffer.length === 0
          || buffer.every((byte) => { byte === 255; })
      ) {
        return;
      }
      const blob = new Blob([buffer], { type: "image/jpeg" });
      this.tileNode.bgLoader.loadUrl(URL.createObjectURL(blob));
    }
    catch (err) {
      console.error(err);
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
      const rect = this.tileNode.getRect();
      if (rect === null) return;
      if (!compareRects(viewData.get(this.tileNode.nodeId)!.rectangle, rect)) {
        resolve(false);
        return;
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
