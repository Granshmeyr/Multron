import { createContext } from "react";
import { Rgb } from "../../common/interfaces.ts";

export const BorderPx = createContext<number>(0);
export const BorderRgb = createContext<Rgb>({ r: 255, g: 255, b: 255  });