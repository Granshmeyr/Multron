import { Direction } from "./enums";
import React, { ReactElement } from "react";
import { TileTree } from "./nodes";

export interface TileProps {
    className?: string;
    style?: React.CSSProperties;
    id?: string;
    url?: URL;
    splitBehavior?: (
      id: string,
      direction: Direction,
    ) => void;
    resizeBehavior?: (id: string, rect: DOMRect) => void;
  }
export interface RowProps {
    children: ReactElement[];
    tileTree: TileTree;
    forceState: React.DispatchWithoutAction;
    initialSplit?: number
    style?: React.CSSProperties;
  }
export interface ColumnProps {
    children: ReactElement[];
    tileTree: TileTree;
    forceState: React.DispatchWithoutAction;
    initialSplit?: number
    style?: React.CSSProperties;
}
export interface ColumnHandleProps { onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void; }
export interface RowHandleProps { onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void; }