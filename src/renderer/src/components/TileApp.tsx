import React, {ReactElement, useEffect, useRef, useState} from "react";
import {Direction} from "../../../common/enums";

let listenerRegistered: boolean = false;

export function TileApp(): ReactElement {
  return (
    <div className="flex w-screen h-screen">
      <Tile className="grow"/>
    </div>
  );
}

function RowTile(): ReactElement {
  return (
    <div className="flex grow flex-row">
      <Tile className="grow" />
      <Tile className="grow" />
    </div>
  );
}

function ColumnTile(): ReactElement {
  const [verticalPercent, setVerticalPercent] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const column = useRef<HTMLDivElement>(null);

  function onMouseDown() {
    setDragging(true);
  }

  useEffect(() => {
    let updateScheduled = false;

    function onMouseUp() {
      setDragging(false);
    }

    function onMouseMove(e: MouseEvent) {
      if (dragging && !updateScheduled && column.current) {
        requestAnimationFrame(() => {
          if (column.current) {
            const divHeight = column.current.offsetHeight;
            const mousePosition = e.clientY - column.current.getBoundingClientRect().top;
            setVerticalPercent(mousePosition / divHeight);
          }
          updateScheduled = false;
        });
      }
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);

    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [dragging]);

  const grow1: string = `${verticalPercent}`;
  const grow2: string = `${1 - verticalPercent}`;

  return (
    <div ref={column} className="flex grow flex-col">
      <Tile style={{flexGrow: grow1}} />
      <Handlebar onMouseDown={onMouseDown} />
      <Tile style={{flexGrow: grow2}} />
    </div>
  );
}

function Handlebar(
  { onMouseDown }: {
    onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void;
  }
): ReactElement {
  return (
    <div className="h-0 relative" onMouseDown={onMouseDown}>
      <div className="handlebar" />
    </div>
  );
}

function Tile(
  {className, style}: {
    className?: string
    style?: React.CSSProperties
 }
): ReactElement {
  const [splitDirection, setSplitDirection] = useState<Direction | null>(null);
  const defaultClass: string = "border-4 border-white border-opacity-50";

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
    return (
      <div
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
        style={style}
      >
      </div>
    );
  }

  function splitLogic(): ReactElement {
    const element: ReactElement = (() => {
      switch (splitDirection) {
      case Direction.Up:
        return <ColumnTile />;
      case Direction.Down:
        return <ColumnTile />;
      case Direction.Left:
        return <RowTile />;
      case Direction.Right:
        return <RowTile />;
      default:
        return <></>;
      }
    })();

    return element;
  }

  return splitDirection == null ? tileElement() : splitLogic();
}
