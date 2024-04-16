import * as ch from "../../common/channels";

export const listeners = new Set<string>();

// https://stackoverflow.com/questions/1484506/random-color-generator#comment18632055_5365036
export function randomColor() {
  return "#" + ("00000"+(Math.random()*(1<<24)|0).toString(16)).slice(-6);
}
export function onResize(id: string, rectangle: Electron.Rectangle) {
  window.electronAPI.send(ch.setViewRectangle, id, rectangle);
}