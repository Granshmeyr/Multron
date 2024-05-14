import { createContext } from "react";
import { Rgba } from "../../common/interfaces.ts";

export const BorderPx = createContext<number>(0);
export const HandleRgba = createContext<Rgba>({ r: 0, g: 255, b: 0, a: 1 });