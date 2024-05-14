import React, { ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import { ColumnHandleProps, ContextParams, RowHandleProps } from "../../common/interfaces.ts";
import * as ich from "../../common/ipcChannels.ts";
import { BaseNode, ContainerNode, TileNode, containers, tiles } from "./nodeTypes.tsx";

function calculateBasis(
  index: number,
  borderPx: number,
  nodesLength: number,
  handlePercents: number[]
): string {
  let value: string;
  if (index >= nodesLength) {
    console.error(`Invalid index for ${calculateBasis.name}`);
    value = "69px";
  }
  else if (index === 0) {
    value = `calc(${handlePercents[0] * 100}% - ${borderPx / 2}px)`;
  }
  else if (index === nodesLength - 1) {
    value = `calc(${(1 - handlePercents[index - 1]) * 100}% - ${borderPx / 2}px)`;
  }
  else {
    value = `calc(${(handlePercents[index] - handlePercents[index - 1]) * 100}% - ${borderPx}px)`;
  }
  return value;
}

function createElement(
  index: number,
  borderPx: number,
  nodeArrayLength: number,
  baseNode: BaseNode,
  handlePercents: number[],
): ReactElement {
  const basis: string = calculateBasis(index, borderPx, nodeArrayLength, handlePercents);
  baseNode.style = { ...baseNode.style, flexBasis: basis };
  return baseNode.toElement();
}

export function buildTree(
  nodes: BaseNode[],
  borderPx: number,
  handlePercents: number[],
  setCurrentHandle: (value: React.SetStateAction<number | null>) => void,
  Handle: React.ComponentType<RowHandleProps> | React.ComponentType<ColumnHandleProps>
): ReactElement[] {
  const elements: ReactElement[] = [];
  const nodesLength: number = nodes.length;
  for (let index = 0; index < nodesLength; index++) {
    const element = createElement(
      index,
      borderPx,
      nodesLength,
      nodes[index],
      handlePercents,
    );
    elements.push(element);

    if (index !== nodesLength - 1) {
      const handle: ReactElement = (
        <Handle
          key={uuidv4()}
          onMouseDown={
            (e: React.DragEvent<HTMLDivElement>) => {
              if (e.button !== 0) {
                return;
              }
              setCurrentHandle(index);
              window.electronAPI.send(ich.hideAllViews);
            }
          }
          onMouseUp={() => window.electronAPI.send(ich.unhideAllViews)}
        ></Handle>
      );
      elements.push(handle);
    }
  }
  return elements;
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