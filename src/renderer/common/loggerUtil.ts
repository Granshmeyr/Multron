import * as ich from "../../common/ipcChannels";

export function info(options: unknown, message: string) {
  window.electronAPI.send(ich.logInfo, options, message);
}
export function error(options: unknown, message: string) {
  window.electronAPI.send(ich.logError, options, message);
}