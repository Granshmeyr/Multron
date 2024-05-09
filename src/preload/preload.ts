/* eslint-disable @typescript-eslint/no-explicit-any */
import { contextBridge, ipcRenderer } from "electron";
import { IpcListener, IpcListenerFunction } from "../common/interfaces";

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
  }
});