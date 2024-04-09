import * as channels from "../../common/channels";
import * as prefixes from "../../common/logPrefixes";

export const listeners = new Set<string>();

// https://stackoverflow.com/questions/1484506/random-color-generator#comment18632055_5365036
export function randomColor() {
  return "#" + ("00000"+(Math.random()*(1<<24)|0).toString(16)).slice(-6);
}
export function onResize(id: string, rectangle: Electron.Rectangle) {
  window.electronAPI.send(channels.setViewRectangle, id, rectangle);
}
export function logInfo(options: unknown, message: string) {
  window.electronAPI.send(channels.logInfo, options, message);
}
export function logError(options: unknown, message: string) {
  window.electronAPI.send(channels.logError, options, message);
}
export function tryForSuccess(channel: string, ...args: unknown[]): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const logOptions = { ts: "util.ts", fn: tryForSuccess.name };
    const name: string = `${tryForSuccess.name}.${channel}`;
    function listener(_event: Electron.IpcRendererEvent, ...args: unknown[]): void {
      listeners.delete(name);
      resolve(args[0] as boolean);
    }
    logInfo(logOptions, `${prefixes.sendingEvent}: ${channel}`);
    window.electronAPI.send(channel, ...args);
    if (!listeners.has(name)) {
      logInfo(logOptions, `${prefixes.listeningOnce}: ${channel}`);
      window.electronAPI.once(`${channel}-response`, listener);
      listeners.add(name);
    }
  });
}