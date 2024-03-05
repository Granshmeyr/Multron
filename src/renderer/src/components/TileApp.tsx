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

function RowTile(
  { style }: { style?: React.CSSProperties; }
): ReactElement {
  const [horizontalPercent, setHorizontalPercent] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  function onMouseDown(e: React.DragEvent<HTMLDivElement>) {
    if (e.button != 0) {
      return;
    }
    setDragging(true);
  }

  useEffect(() => {
    let updateScheduled = false;

    function onMouseUp(e: MouseEvent) {
      if (e.button != 0) {
        return;
      }
      setDragging(false);
    }

    function onMouseMove(e: MouseEvent) {
      if (dragging && !updateScheduled && rowRef.current) {
        requestAnimationFrame(() => {
          if (rowRef.current) {
            const divWidth = rowRef.current.offsetWidth;
            const mousePosition = e.clientX - rowRef.current.getBoundingClientRect().left;
            setHorizontalPercent(mousePosition / divWidth);
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

  const grow1: string = `${horizontalPercent}`;
  const grow2: string = `${1 - horizontalPercent}`;

  return (
    <div ref={rowRef} className="flex grow flex-row" style={style}>
      <Tile style={{flexGrow: grow1}} />
      <RowHandle onMouseDown={onMouseDown} />
      <Tile style={{flexGrow: grow2}} />
    </div>
  );
}

function ColumnTile(
  { style }: { style?: React.CSSProperties; }
): ReactElement {
  const [verticalPercent, setVerticalPercent] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const columnRef = useRef<HTMLDivElement>(null);

  function onMouseDown(e: React.DragEvent<HTMLDivElement>) {
    if (e.button != 0) {
      return;
    }
    setDragging(true);
  }

  useEffect(() => {
    let updateScheduled = false;

    function onMouseUp(e: MouseEvent) {
      if (e.button != 0) {
        return;
      }
      setDragging(false);
    }

    function onMouseMove(e: MouseEvent) {
      if (dragging && !updateScheduled && columnRef.current) {
        requestAnimationFrame(() => {
          if (columnRef.current) {
            const divHeight = columnRef.current.offsetHeight;
            const mousePosition = e.clientY - columnRef.current.getBoundingClientRect().top;
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
    <div ref={columnRef} className="flex grow flex-col" style={style}>
      <Tile style={{flexGrow: grow1}} />
      <ColumnHandle onMouseDown={onMouseDown} />
      <Tile style={{flexGrow: grow2}} />
    </div>
  );
}

function ColumnHandle(
  { onMouseDown }: { onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void; }
): ReactElement {
  return (
    <div className="h-0 relative" onMouseDown={onMouseDown}>
      <div className="handle-col" />
    </div>
  );
}

function RowHandle(
  { onMouseDown }: { onMouseDown: (e: React.DragEvent<HTMLDivElement>) => void; }
): ReactElement {
  return (
    <div className="w-0 relative" onMouseDown={onMouseDown}>
      <div className="handle-row" />
    </div>
  );
}

function Tile(
  {className, style}: {
    className?: string;
    style?: React.CSSProperties;
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
        return <ColumnTile style={style} />;
      case Direction.Down:
        return <ColumnTile style={style} />;
      case Direction.Left:
        return <RowTile style={style} />;
      case Direction.Right:
        return <RowTile style={style} />;
      default:
        return <></>;
      }
    })();

    return element;
  }

  return splitDirection == null ? tileElement() : splitLogic();
}
