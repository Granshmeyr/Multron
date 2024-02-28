import { useState } from "react";
import { Direction } from "../../../common/enums";

let listenerRegistered: boolean = false;

export function TileApp(): JSXElement {
  return <Tile className="h-screen w-screen z-50"/>;
}

function RowTile(
  { children }: React.PropsWithChildren<unknown>
): JSXElement {
  return <div
    className="flex flex-row flex-grow w-full h-full">
    {children}
  </div>;
}

function ColumnTile(
  { children }: React.PropsWithChildren<unknown>
): JSXElement {
  return <div
    className=" flex flex-col flex-grow w-full h-full">
    {children}
  </div>;
}

function Tile(
  {
    className
  }: {
    className?: string,
    key?: string | number
  }
): JSXElement {
  const [splitDirection, setSplitDirection] = useState<Direction | null>(null);
  const defaultClass: string = "flex flex-grow border-4 border-white border-opacity-50";

  async function showSplitMenu(): Promise<Direction | null> {
    return new Promise<Direction | null>((resolve) => {
      function listener(_event: Electron.IpcRendererEvent, ...args: unknown[]): void {
        listenerRegistered = false;
        resolve(args[0] as (Direction | null));
      }

      window.electronAPI.send("show-split-menu");
      if (!listenerRegistered) {
        window.electronAPI.once("show-split-menu-response", listener);
        listenerRegistered = true;
      }
    });
  }

  function unsplit(): JSXElement {
    return <div
      className={ `${defaultClass} ${className}` }
      onContextMenu={
        async () => {
          const direction: Direction | null = await showSplitMenu();
          if (direction == null) {
            return;
          }
          setSplitDirection(direction);
        }
      }>
    </div>;
  }

  function split(): JSXElement {
    const element: JSXElement = (() => {
      switch (splitDirection) {
      case Direction.Up:
        return <ColumnTile><Tile /><Tile /></ColumnTile>;
      case Direction.Down:
        return <ColumnTile><Tile /><Tile /></ColumnTile>;
      case Direction.Left:
        return <RowTile><Tile /><Tile/></RowTile>;
      case Direction.Right:
        return <RowTile><Tile /><Tile /></RowTile>;
      default:
        return <></>;
      }
    })();

    return <div className={ `flex flex-grow ${className}` }>
      {element}
    </div>;
  }

  return splitDirection == null ? unsplit() : split();
}
