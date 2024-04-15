import React, { ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import * as ch from "../../common/channels";
import { ColumnHandleProps, ContextParams, RowHandleProps } from "../../common/interfaces";
import * as pre from "../../common/logPrefixes";
import * as log from "../common/loggerUtil";
import { BaseNode, ContainerNode, TileNode, containers, tiles } from "./nodes";

const fileName: string = "containerShared.tsx";

function calculateGrow(
  index: number,
  nodeArrayLength: number,
  handlePercents: number[]
): number {
  let grow: number;
  if (index >= nodeArrayLength) {
    console.error("Invalid index");
    grow = -1;
  }
  else if (index === 0) {
    grow = handlePercents[0];
  }
  else if (index === nodeArrayLength - 1) {
    grow = 1 - handlePercents[index - 1];
  }
  else {
    grow = handlePercents[index] - handlePercents[index - 1];
  }
  return grow;
}

function createElement(
  index: number,
  nodeArrayLength: number,
  baseNode: BaseNode,
  handlePercents: number[],
): ReactElement {
  const logOptions = { ts: fileName, fn: createElement.name };
  const flexGrow: number = calculateGrow(index, nodeArrayLength, handlePercents);
  //console.log(`calculateGrow({${index}}, {${nodeArrayLength}}, {${handlePercents}}) = ${flexGrow}`);
  log.info(logOptions, `${pre.running}: ${createElement.name} with flexGrow ${flexGrow}`);
  baseNode.appendStyle({ flexGrow: flexGrow });
  return baseNode.toElement();
}

export function buildTree(
  nodeArray: BaseNode[],
  handlePercents: number[],
  setCurrentHandle: (value: React.SetStateAction<number | null>) => void,
  Handle: React.ComponentType<RowHandleProps> | React.ComponentType<ColumnHandleProps>
): ReactElement[] {
  const logOptions = { ts: fileName, fn: buildTree.name };
  const elementArray: ReactElement[] = [];
  const arrayLength: number = nodeArray.length;
  for (let index = 0; index < arrayLength; index++) {
    const element = createElement(
      index,
      arrayLength,
      nodeArray[index],
      handlePercents,
    );
    elementArray.push(element);

    if (index !== arrayLength - 1) {
      const handle: ReactElement = (
        <Handle
          key={ uuidv4() }
          onMouseDown={
            (e: React.DragEvent<HTMLDivElement>) => {
              if (e.button !== 0) {
                return;
              }
              log.info(logOptions, `${pre.userInteraction}: Dragging handle index "${index}"`);
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

export function deleteTile(containerId: string, tileId: string, refreshRoot: React.DispatchWithoutAction) {
  const parent = tiles[tileId].parent as ContainerNode;
  const grandparent = parent.parent as ContainerNode;
  function deleteTileFromParent(index: number) {
    parent.children.splice(index, 1);
    parent.handlePercents.splice(index, 1);
    window.electronAPI.send(ch.deleteView, tileId);
    delete tiles[tileId];
    refreshRoot();
  }
  function deleteParent(index: number) {
    const otherIndex: number = index === 1 ? 0 : 1;
    let parentIndex: number;
    for (let i = 0; i < grandparent.children.length; i++) {
      const node = grandparent.children[i];
      if (node instanceof ContainerNode && node.id === containerId) {
        parentIndex = i;
      }
    }
    grandparent.children[parentIndex!] = parent.children[otherIndex];
    grandparent.children[parentIndex!].parent = grandparent;
    window.electronAPI.send(ch.deleteView, tileId);
    delete tiles[tileId];
    delete containers[containerId];
    refreshRoot();
  }
  for (let i = 0; i < parent.children.length; i++) {
    const node = parent.children[i];
    if (node instanceof TileNode && node.id === tileId) {
      (() => {
        switch (parent.children.length) {
        case 2: deleteParent(i); break;
        default: deleteTileFromParent(i); break;
        }
      })();
    }
  }
}

export function setUrl(tileId: string, params: ContextParams) {
  tiles[tileId].url = new URL(params.url as string);
}