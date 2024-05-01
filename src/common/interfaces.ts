import React from "react";
import { BaseNode } from "../renderer/common/nodeTypes";
import { ContextOption, Direction } from "./enums";

export interface TileProps {
  className?: string;
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