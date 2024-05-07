import React from "react";
import { BaseNode } from "../renderer/common/nodeTypes";
import { ContextOption, Direction } from "./enums";
import { IpcRendererEvent } from "electron/renderer";

export interface TileProps {
  style?: React.CSSProperties;
  nodeId?: string;
  url?: URL;
  contextBehavior: (id: string, params: ContextParams) => void;
  resizeBehavior: (id: string, rectangle: Electron.Rectangle) => void;
}
export interface RowProps {
  children: BaseNode[];
  refreshRoot: React.DispatchWithoutAction;
  setRoot: React.Dispatch<React.SetStateAction<BaseNode>>
  rootContextBehavior: (id: string, params: ContextParams) => void;
  handlePercents: number[];
  style?: React.CSSProperties;
  nodeId?: string;
}
export interface ColumnProps {
  children: BaseNode[];
  refreshRoot: React.DispatchWithoutAction;
  setRoot: React.Dispatch<React.SetStateAction<BaseNode>>
  rootContextBehavior: (id: string, params: ContextParams) => void;
  handlePercents: number[];
  style?: React.CSSProperties;
  nodeId?: string;
}
export interface ColumnHandleProps {
  onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void;
  onMouseUp: React.MouseEventHandler<HTMLDivElement>;
}
export interface RowHandleProps {
  onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void;
  onMouseUp: React.MouseEventHandler<HTMLDivElement>;
}
export interface Vector2 { x: number, y: number }
export interface ContextParams {
  option: ContextOption,
  direction?: Direction,
  url?: string
}
export interface ViewData {
  url: string | null,
  rectangle: Electron.Rectangle
}
export interface Listener {
  channel: string,
  fn: (_: IpcRendererEvent, ...args: unknown[]) => void
  uuid: string
}
export interface TaskbarBounds {
  direction: Direction,
  width: number,
  height: number
}
export interface DisplayMetrics {
  screen: {
    bounds: Electron.Rectangle,
    workArea: Electron.Rectangle
  },
  taskbar: TaskbarBounds
}