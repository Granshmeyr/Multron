import { ReactElement } from "react";
import { ColumnHandleProps, TileProps, RowHandleProps} from "./props";
import React from "react";
import { v4 as uuidv4 } from "uuid";

function calculateGrow(
  index: number,
  children: ReactElement[],
  handlePercents: number[]
): number {
  let grow: number;
  if (index >= children.length) {
    console.error("Invalid index");
    grow = -1;
  }
  else if (index === 0) {
    grow = handlePercents[0];
  }
  else if (index === children.length - 1) {
    grow = 1 - handlePercents[index - 1];
  }
  else {
    grow = handlePercents[index] - handlePercents[index - 1];
  }
  return grow;
}

export function buildContainerElements(
  children: ReactElement[],
  behaviorProps: TileProps,
  handlePercents: number[],
  setCurrentHandle: (value: React.SetStateAction<number | null>) => void,
  Handle: React.ComponentType<RowHandleProps> | React.ComponentType<ColumnHandleProps>
): ReactElement[] {
  const elementArray: ReactElement[] = [];
  for (let i = 0; i < children.length; i++) {
    const tile: ReactElement = React.cloneElement(
      children[i], {
        ...children[i].props,
        ...behaviorProps,
        style: {
          ...children[i].props.style,
          ...{ flexGrow: calculateGrow(i, children, handlePercents) }
        }
      }
    );
    elementArray.push(tile);

    if (i !== children.length - 1) {
      const handle: ReactElement = (
        <Handle
          key={ uuidv4() }
          onMouseDown={
            (e: React.DragEvent<HTMLDivElement>) => {
              if (e.button !== 0) {
                return;
              }
              setCurrentHandle(i);
            }
          }
        ></Handle>
      );
      elementArray.push(handle);
    }
  }
  return elementArray;
}
