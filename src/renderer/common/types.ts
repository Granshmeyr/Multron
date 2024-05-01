import * as ch from "../../common/channels";
import { ViewData } from "../../common/interfaces";
import { tiles } from "./nodeTypes";
import { compareRects, fpsToMs } from "./util";

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
export class ResizeTicker {
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
        if (rect === null) {
          continue;
        }
        const buffer = await window.electronAPI.invoke(
          ch.resizeCapture, id, rect
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
    this.refreshRoot!();
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
    const viewData = await window.electronAPI.invoke(ch.getViewData) as Map<string, ViewData>;
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

export const resizeTicker = new ResizeTicker(fpsToMs(10));
