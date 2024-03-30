import React, { ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import { Column, Row, Tile } from "../renderer/src/components/TileApp";
import { BaseNode, ColumnNode, RowNode, TileNode, TileTree } from "./nodes";
import { ColumnHandleProps, RowHandleProps, TileBehaviors } from "./props";

function calculateGrow(
  index: number,
  childCount: number,
  handlePercents: number[]
): number {
  let grow: number;
  if (index >= childCount) {
    console.error("Invalid index");
    grow = -1;
  }
  else if (index === 0) {
    grow = handlePercents[0];
  }
  else if (index === childCount - 1) {
    grow = 1 - handlePercents[index - 1];
  }
  else {
    grow = handlePercents[index] - handlePercents[index - 1];
  }
  return grow;
}

function buildToTile(
  index: number,
  nodeCount: number,
  baseNode: BaseNode,
  behaviorProps: TileBehaviors,
  handlePercents: number[],
  tileTree: TileTree,
  forceState: React.DispatchWithoutAction
): ReactElement {
  if (baseNode instanceof TileNode) {
    return <Tile
      {...baseNode.props}
      {...behaviorProps}
      style={
        {
          ...baseNode.props.style,
          ...{ flexGrow: calculateGrow(index, nodeCount, handlePercents) }
        }
      }
    ></Tile>;
  }
  else if (baseNode instanceof RowNode) {
    return <Row
      nodeArray={baseNode.children}
      tileTree={tileTree}
      forceState={forceState}
      initialSplit={baseNode.initialSplit}
      style={
        { flexGrow: calculateGrow(index, nodeCount, handlePercents) }
      }
    ></Row>;
  }
  else if (baseNode instanceof ColumnNode) {
    return <Column
      nodeArray={baseNode.children}
      tileTree={tileTree}
      forceState={forceState}
      initialSplit={baseNode.initialSplit}
      style={
        { flexGrow: calculateGrow(index, nodeCount, handlePercents) }
      }
    ></Column>;
  }
  return <></>;
}

export function buildTree(
  tileTree: TileTree,
  forceState: React.DispatchWithoutAction,
  nodeArray: BaseNode[],
  behaviorProps: TileBehaviors,
  handlePercents: number[],
  setCurrentHandle: (value: React.SetStateAction<number | null>) => void,
  Handle: React.ComponentType<RowHandleProps> | React.ComponentType<ColumnHandleProps>
): ReactElement[] {
  const elementArray: ReactElement[] = [];
  const nodeCount: number = nodeArray.length;
  for (let index = 0; index < nodeCount; index++) {
    const element = buildToTile(
      index,
      nodeArray.length,
      nodeArray[index],
      behaviorProps,
      handlePercents,
      tileTree,
      forceState
    );
    elementArray.push(element);

    if (index !== nodeCount - 1) {
      const handle: ReactElement = (
        <Handle
          key={ uuidv4() }
          onMouseDown={
            (e: React.DragEvent<HTMLDivElement>) => {
              if (e.button !== 0) {
                return;
              }
              setCurrentHandle(index);
            }
          }
        ></Handle>
      );
      elementArray.push(handle);
    }
  }
  return elementArray;
}
