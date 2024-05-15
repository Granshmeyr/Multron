/* eslint-disable @typescript-eslint/no-explicit-any */
import { Titlebar, TitlebarColor } from "custom-electron-titlebar";
import { contextBridge, ipcRenderer } from "electron";
import { IpcListener, IpcListenerFunction } from "../common/interfaces.ts";
import * as ich from "../common/ipcChannels.ts";

let titlebar: Titlebar | null = null;

if (window.location.href === "http://localhost:5173/") {
  window.addEventListener("DOMContentLoaded", () => {
    titlebar = new Titlebar({
      backgroundColor: TitlebarColor.fromHex("#0A84D0")
    });
    const container = titlebar.containerElement;
    const element = titlebar.titlebarElement;
    const menu = document.querySelector(".cet-menubar") as HTMLElement;
    menu.style.display = "none";
    element.style.pointerEvents = "all";
    container.style.display = "flex";
    ipcRenderer.send(ich.updateTitlebarPx, titlebar!.titlebarElement.offsetHeight);

    element.addEventListener("resize", () => {
      ipcRenderer.send(ich.updateTitlebarPx, titlebar!.titlebarElement.offsetHeight);
    });
    element.addEventListener("mouseup", () => {
      ipcRenderer.send(ich.releaseHandles);
    });
  });
}

class ListenerRegistry {
  private registry = new Map<string, Set<IpcListener>>();

  removeListener(channel: string, listener: IpcListener) {
    if (!this.registry.has(channel)) this.registry.set(channel, new Set<IpcListener>());
    this.registry.get(channel)!.delete(listener);
  }
  addListener(channel: string, listener: IpcListener) {
    if (!this.registry.has(channel)) this.registry.set(channel, new Set<IpcListener>());
    this.registry.get(channel)!.add(listener);
  }
  getChannelListeners(channel: string): Set<IpcListener> {
    if (!this.registry.has(channel)) this.registry.set(channel, new Set<IpcListener>());
    return this.registry.get(channel)!;
  }
  channelHasListener(channel: string,  listener: IpcListener): boolean {
    if (!this.registry.has(channel)) this.registry.set(channel, new Set<IpcListener>());
    for (const l of this.registry.get(channel)!) {
      if (l.uuid === listener.uuid) {
        return true;
      }
    }
    return false;
  }
}
const reg = new ListenerRegistry();

contextBridge.exposeInMainWorld("electronAPI", {
  send: (
    channel: string,
    ...args: any[]
  ) => {
    ipcRenderer.send(channel, ...args);
  },
  on: (
    channel: string,
    listener: IpcListener
  ) => {
    if (reg.channelHasListener(channel, listener)) return;
    reg.addListener(channel, listener);
    ipcRenderer.on(channel, listener.fn);
  },
  once: (
    channel: string,
    listener: IpcListenerFunction
  ) => {
    ipcRenderer.once(channel, listener);
  },
  removeListener: (
    channel: string,
    listener: IpcListener
  ) => {
    if (reg.channelHasListener(channel, listener)) {
      reg.getChannelListeners(channel)?.delete(listener);
      ipcRenderer.removeListener(channel, listener.fn);
    }
  },
  invoke: (
    channel: string,
    ...args: any[]
  ): Promise<any> => {
    return ipcRenderer.invoke(channel, ...args);
  },
  setTitlebarBg: (
    hex: string
  ) => {
    titlebar!.updateBackground(TitlebarColor.fromHex(hex));
  }
});