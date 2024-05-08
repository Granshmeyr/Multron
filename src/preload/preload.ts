/* eslint-disable @typescript-eslint/no-explicit-any */
import { contextBridge, ipcRenderer } from "electron";

class ListenerRegistry {
  private listeners = new Map<string, Set<string>>();
  add(channel: string, uuid: string) {
    this.getSetOrNew(channel).add(uuid);
  }
  delete(channel: string, uuid: string) {
    this.getSetOrNew(channel).delete(uuid);
  }
  has(channel: string, uuid: string): boolean {
    if (!this.listeners.has(channel)) return false;
    if (!this.listeners.get(channel)!.has(uuid)) return false;
    return true;
  }
  private getSetOrNew(channel: string): Set<string> {
    let set = this.listeners.get(channel);
    if (set === undefined) {
      const newSet = new Set<string>();
      this.listeners.set(channel, newSet);
      set = newSet;
    }
    return set;
  }
}
const listenerRegistry = new ListenerRegistry();

contextBridge.exposeInMainWorld("electronAPI", {
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args);
  },
  on: (
    channel: string,
    uuid: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) => {
    if (listenerRegistry.has(channel, uuid)) {
      console.error(`Not registering ${channel} for ${uuid}, already registered.`);
    }
    console.log(`REGISTERING ${channel} FOR ${uuid}`);
    listenerRegistry.add(channel, uuid);
    ipcRenderer.on(channel, listener);
  },
  once: (
    channel: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void
  ) => {
    ipcRenderer.once(channel, listener);
  },
  removeListener: (
    channel: string,
    uuid: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ) => {
    if (listenerRegistry.has(channel, uuid)) {
      listenerRegistry.delete(channel, uuid);
      ipcRenderer.removeListener(channel, listener);
    }
  },
  invoke: (
    channel: string,
    ...args: any[]
  ): Promise<any> => {
    return ipcRenderer.invoke(channel, ...args);
  },
  isListening: (
    channel: string,
    uuid: string
  ): boolean => {
    return listenerRegistry.has(channel, uuid);
  }
});