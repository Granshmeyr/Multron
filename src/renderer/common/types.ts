import * as ch from "../../common/channels";
import { tiles } from "./nodeTypes";

export class ResizeTicker {
  rectangles = new Map<string, Electron.Rectangle>();
  private timeout: NodeJS.Timeout | null = null;
  private ms: number;
  private enabled: boolean = false;

  constructor(ms: number) {
    this.ms = ms;
  }

  private tick() {
    for (const [id, rectangle] of this.rectangles.entries()) {
      console.log("resizing tile stuff");
      requestAnimationFrame(async () => {
        try {
          const buffer = await window.electronAPI.invoke(ch.resizeCapture, id, rectangle) as Buffer;
          const blob = new Blob([buffer], { type: "image/jpeg" });
          tiles.get(id)!.img = URL.createObjectURL(blob);
        }
        catch (err) {
          console.error(err);
        }
      });
    }
  }
  enable() {
    if (!this.enabled) {
      this.enabled = true;
      this.timeout = setInterval(
        this.tick.bind(this),
        this.ms
      );
    }
  }
  disable() {
    if (this.enabled) {
      this.enabled = false;
      if (this.timeout !== null) {
        clearInterval(this.timeout);
        this.timeout = null;
      }
    }
  }
}