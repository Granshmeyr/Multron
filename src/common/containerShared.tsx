import React, { ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import { ColumnHandleProps, RowHandleProps } from "./interfaces";
import { BaseNode } from "./nodes";

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

function createElement(
  handlesIndex: number,
  handlesLength: number,
  baseNode: BaseNode,
  handlesArray: number[],
): ReactElement {
  baseNode.appendStyle({ flexGrow: calculateGrow(handlesIndex, handlesLength, handlesArray) });
  return baseNode.toElement();
}

export function buildTree(
  nodeArray: BaseNode[],
  handlePercents: number[],
  setCurrentHandle: (value: React.SetStateAction<number | null>) => void,
  Handle: React.ComponentType<RowHandleProps> | React.ComponentType<ColumnHandleProps>
): ReactElement[] {
  const elementArray: ReactElement[] = [];
  const arrayLength: number = nodeArray.length;
  for (let index = 0; index < arrayLength; index++) {
    const element = createElement(
      index,
      nodeArray.length,
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
