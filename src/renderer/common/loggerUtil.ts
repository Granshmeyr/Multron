import * as ch from "../../common/channels";

export function info(options: unknown, message: string) {
  window.electronAPI.send(ch.logInfo, options, message);
}
export function error(options: unknown, message: string) {
  window.electronAPI.send(ch.logError, options, message);
}