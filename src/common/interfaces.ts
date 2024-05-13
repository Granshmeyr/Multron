import React from "react";
import { BaseNode, ColumnNode, ContainerNode, RowNode, TileNode } from "../renderer/common/nodeTypes.tsx";
import { ContextOption, Direction } from "./enums.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IpcListenerFunction = (e: Electron.IpcRendererEvent, ...args: any[]) => void;
export type ContextBehavior = (nodeId: string, params: ContextParams, pos?: Vector2) => void

export interface TileProps {
  style?: React.CSSProperties;
  nodeId: string;
  url?: URL;
  contextBehavior: ContextBehavior;
  thisNode: TileNode;
}
export interface RowProps {
  children: BaseNode[];
  refreshRoot: React.DispatchWithoutAction;
  setRoot: React.Dispatch<React.SetStateAction<BaseNode>>
  rootContextBehavior: ContextBehavior;
  handlePercents: number[];
  style?: React.CSSProperties;
  nodeId: string;
  thisNode: RowNode;
}
export interface ColumnProps {
  children: BaseNode[];
  refreshRoot: React.DispatchWithoutAction;
  setRoot: React.Dispatch<React.SetStateAction<BaseNode>>;
  rootContextBehavior: ContextBehavior;
  handlePercents: number[];
  style?: React.CSSProperties;
  nodeId: string;
  thisNode: ColumnNode;
}
export interface ColumnHandleProps {
  onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void;
  onMouseUp: React.MouseEventHandler<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  containerNode: ContainerNode;
}
export interface RowHandleProps {
  onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void;
  onMouseUp: React.MouseEventHandler<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  containerNode: ContainerNode;
}
export interface Vector2 { x: number, y: number }
export interface ContextParams {
  option: ContextOption;
  direction?: Direction;
  url?: string;
}
export interface ViewData {
  url: string | null;
  rectangle: Electron.Rectangle;
}
export interface IpcListener {
  uuid: string;
  fn: IpcListenerFunction;
}
export interface TaskbarBounds {
  direction: Direction;
  width: number;
  height: number;
}
export interface DisplayMetrics {
  screen: {
    bounds: Electron.Rectangle;
    workArea: Electron.Rectangle;
  },
  taskbar: TaskbarBounds
}
export interface Shortcut {
  accelerator: string;
  callback: () => void;
}
export interface CustomShortcuts {
  focus?: Shortcut[];
  [key: string]: Shortcut[] | undefined;
}
export interface Chest<T> {
  item: T;
}
export interface Neighbors {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}
export interface HandleDimensions {
  offset: number;
  length: number;
}
export interface Rgb {
  r: number;
  g: number;
  b: number;
}