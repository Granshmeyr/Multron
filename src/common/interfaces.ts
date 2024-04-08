import React from "react";
import { ContextOption, Direction } from "./enums";
import { BaseNode } from "./nodes";

export interface TileProps {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  url?: URL;
  contextBehavior: (id: string, params: ContextParams) => void;
  resizeBehavior: (id: string, rectangle: Electron.Rectangle) => void;
}
export interface RowProps {
  children: BaseNode[];
  forceState: React.DispatchWithoutAction;
  initialSplit?: number
  style?: React.CSSProperties;
}
export interface ColumnProps {
  children: BaseNode[];
  forceState: React.DispatchWithoutAction;
  initialSplit?: number
  style?: React.CSSProperties;
}
export interface ColumnHandleProps { onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void; }
export interface RowHandleProps { onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void; }
export interface Vector2 { x: number, y: number }
export interface ContextParams {
  option: ContextOption,
  direction?: Direction,
  url?: string
}