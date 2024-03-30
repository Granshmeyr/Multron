import { Direction } from "./enums";
import React from "react";
import { BaseNode, TileTree } from "./nodes";

export interface TileProps {
  className?: string;
  style?: React.CSSProperties;
  id: string;
  url?: URL;
  splitBehavior: (
    id: string,
    direction: Direction,
  ) => void;
  resizeBehavior: (id: string, rect: DOMRect) => void;
}
export interface TileBehaviors {
  splitBehavior: (
    id: string,
    direction: Direction,
  ) => void;
  resizeBehavior: (id: string, rect: DOMRect) => void;
}
export interface RowProps {
  nodeArray: BaseNode[];
  tileTree: TileTree;
  forceState: React.DispatchWithoutAction;
  initialSplit?: number
  style?: React.CSSProperties;
}
export interface ColumnProps {
    nodeArray: BaseNode[];
    tileTree: TileTree;
    forceState: React.DispatchWithoutAction;
    initialSplit?: number
    style?: React.CSSProperties;
}
export interface ColumnHandleProps { onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void; }
export interface RowHandleProps { onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void; }