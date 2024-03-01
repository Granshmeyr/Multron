import {ReactElement, useState} from "react";
import {Direction} from "../../../common/enums";

let listenerRegistered: boolean = false;

export function TileApp(): ReactElement {
  return <div className="flex w-screen h-screen">
    <Tile />
  </div>;
}

function RowTile(
  {children}: {children: [ReactElement, ReactElement]}
): ReactElement {
  return <div className="flex flex-row flex-grow w-full h-full">
    {children}
  </div>;
}

function ColumnTile(
  {children}: {children: [ReactElement, ReactElement]}
): ReactElement {
  return <div
    className="flex flex-col w-full h-full"
    style={{ flex: "5" }}>
    {children}
  </div>;
}

function ColoredBar({color, width, height}: {color: string; width: string; height: string}): ReactElement {
  return (
    <div
      style={{
        backgroundColor: color,
        width: width,
        height: height,
      }}
    />
  );
}

function OverlayCenter(
  {children}: {children: [ReactElement, ReactElement]}
): ReactElement {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{flex: "5"}}>
      {children[0]}
      <div
        className="absolute flex top-0 left-0 w-full h-full items-center justify-center"
        style={{pointerEvents: "none"}}>
        {children[1]}
      </div>
    </div>
  );
}

function Tile(
  {className}: {
    className?: string,
    key?: string | number
 }
): ReactElement {
  const [splitDirection, setSplitDirection] = useState<Direction | null>(null);
  const defaultClass: string = "flex border-4 border-white border-opacity-50";

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

  function tileElement(): ReactElement {
    return <div
      className={`${defaultClass} ${className}`}
      onContextMenu={
        async () => {
          const direction: Direction | null = await showSplitMenu();
          if (direction == null) {
            return;
          }
          setSplitDirection(direction);
        }
      }
      style={{flex: "5"}}>
    </div>;
  }

  function splitLogic(): ReactElement {
    const element: ReactElement = (() => {
      switch (splitDirection) {
      case Direction.Up:
        return <OverlayCenter>
          <ColumnTile><Tile /><Tile /></ColumnTile>
          <ColoredBar color="blue" width="50px" height="5px" />
        </OverlayCenter>;
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

    return element;
  }

  return splitDirection == null ? tileElement() : splitLogic();
}
