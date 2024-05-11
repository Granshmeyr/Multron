import React, { ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import { ColumnHandleProps, ContextParams, RowHandleProps } from "../../common/interfaces";
import * as ich from "../../common/ipcChannels";
import * as pre from "../../common/logPrefixes";
import * as log from "./loggerUtil";
import { BaseNode, ContainerNode, TileNode, containers, tiles } from "./nodeTypes";
import { viewRectEnforcer } from "./types";

const fileName: string = "containerShared.tsx";

function calculateBasis(
  index: number,
  nodeArrayLength: number,
  handlePercents: number[]
): number {
  let basis: number;
  if (index >= nodeArrayLength) {
    console.error("Invalid index");
    basis = -1;
  }
  else if (index === 0) {
    basis = handlePercents[0];
  }
  else if (index === nodeArrayLength - 1) {
    basis = 1 - handlePercents[index - 1];
  }
  else {
    basis = handlePercents[index] - handlePercents[index - 1];
  }
  return basis * 100;
}

function createElement(
  index: number,
  nodeArrayLength: number,
  baseNode: BaseNode,
  handlePercents: number[],
): ReactElement {
  const logOptions = { ts: fileName, fn: createElement.name };
  const basis: number = calculateBasis(index, nodeArrayLength, handlePercents);
  // #region logging
  log.info(logOptions, `${pre.running}: ${createElement.name} with flexBasis ${basis}%`);
  // #endregion
  baseNode.style = { ...baseNode.style, flexBasis: `${basis}%` };
  return baseNode.toElement();
}

export function buildTree(
  nodeArray: BaseNode[],
  handlePercents: number[],
  setCurrentHandle: (value: React.SetStateAction<number | null>) => void,
  containerRef: React.RefObject<HTMLDivElement>,
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
          key={uuidv4()}
          onMouseDown={
            (e: React.DragEvent<HTMLDivElement>) => {
              if (e.button !== 0) {
                return;
              }
              // #region logging
              log.info(logOptions, `${pre.userInteraction}: Dragging handle index "${index}"`);
              // #endregion
              setCurrentHandle(index);
              viewRectEnforcer.start();
            }
          }
          onMouseUp={() => { return; }}
          containerRef={containerRef}
        ></Handle>
      );
      elementArray.push(handle);
    }
  }
  return elementArray;
}

export function deletion(
  containerId: string,
  tileId: string,
  refreshRoot: React.DispatchWithoutAction,
  setRoot: React.Dispatch<React.SetStateAction<BaseNode>>,
  rootContextBehavior: (id: string, params: ContextParams) => void
) {
  const parent = tiles.get(tileId)!.parent as ContainerNode;
  const grandparent = parent.parent;
  function deleteTileFromParent(index: number) {
    parent.children.splice(index, 1);
    parent.handlePercents.splice(index, 1);
    window.electronAPI.send(ich.deleteView, tileId);
    tiles.delete(tileId);
    refreshRoot();
  }
  function deleteParent(index: number) {
    if (grandparent === null || !(grandparent instanceof ContainerNode)) {
      return;
    }
    const otherIndex: number = index === 1 ? 0 : 1;
    let parentIndex: number;
    for (let i = 0; i < grandparent.children.length; i++) {
      const node = grandparent.children[i];
      if (node instanceof ContainerNode && node.nodeId === containerId) {
        parentIndex = i;
      }
    }
    const otherNode = parent.children[otherIndex];
    grandparent.children[parentIndex!] = otherNode;
    otherNode.parent = grandparent;
    window.electronAPI.send(ich.deleteView, tileId);
    tiles.delete(tileId);
    containers.delete(containerId);
    refreshRoot();
  }
  function deleteParentAndSetRoot(index: number) {
    const otherIndex: number = index === 1 ? 0 : 1;
    const otherNode = parent.children[otherIndex];
    setRoot(otherNode);
    otherNode.parent = null;
    if (otherNode.style === undefined) {
      return;
    }
    const { ...otherProps } = otherNode.style;
    otherNode.style = otherProps;
    if (otherNode instanceof TileNode) {
      otherNode.contextBehavior = rootContextBehavior;
    }
    window.electronAPI.send(ich.deleteView, tileId);
    tiles.delete(tileId);
    containers.delete(containerId);
    refreshRoot();
  }
  for (let i = 0; i < parent.children.length; i++) {
    const node = parent.children[i];
    const childCount = parent.children.length;
    if (node instanceof TileNode && node.nodeId === tileId) {
      if (childCount !== 2) { deleteTileFromParent(i); break; }
      if (grandparent !== null) { deleteParent(i); break; }
      deleteParentAndSetRoot(i); break;
    }
  }
}

export function setUrl(tileId: string, params: ContextParams) {
  tiles.get(tileId)!.url = new URL(params.url as string);
}