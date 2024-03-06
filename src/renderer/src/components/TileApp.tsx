import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Direction } from "../../../common/enums";
import { v4 as uuidv4 } from "uuid";

let listenerRegistered: boolean = false;

export function TileApp(): ReactElement {
  return (
    <div className="flex w-screen h-screen">
      <Tile className="grow"/>
    </div>
  );
}

function RowTile(
  { children, style }: {
    children?: ReactElement[];
    style?: React.CSSProperties;
  }
): ReactElement {
  const [horizontalPercent, setHorizontalPercent] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function onMouseDown(e: React.DragEvent<HTMLDivElement>) {
    if (e.button != 0) {
      return;
    }
    setDragging(true);
  }

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (e.button != 0) {
        return;
      }
      setDragging(false);
    }

    function onMouseMove(e: MouseEvent) {
      if (dragging && ref.current) {
        requestAnimationFrame(() => {
          if (ref.current) {
            const divWidth = ref.current.offsetWidth;
            const mousePosition = e.clientX - ref.current.getBoundingClientRect().left;
            setHorizontalPercent(mousePosition / divWidth);
          }
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

  let child1: ReactElement | undefined;
  if (children) {
    const style = { flexGrow: grow1 };
    child1 = React.cloneElement(children[0], {
      ...children[0].props,
      style: {
        ...children[0].props.style,
        ...style
      }
    });
  }

  let child2: ReactElement | undefined;
  if (children) {
    const style = { flexGrow: grow2 };
    child2 = React.cloneElement(children[1], {
      ...children[1].props,
      style: {
        ...children[1].props.style,
        ...style
      }
    });
  }

  return (
    <div ref={ref} className="flex grow flex-row" style={style}>
      {child1}
      <RowHandle onMouseDown={onMouseDown} />
      {child2}
    </div>
  );
}

function ColumnTile(
  { children, style }: {
    children?: ReactElement[];
    style?: React.CSSProperties;
  }
): ReactElement {
  const [verticalPercent, setVerticalPercent] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function onMouseDown(e: React.DragEvent<HTMLDivElement>) {
    if (e.button != 0) {
      return;
    }
    setDragging(true);
  }

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (e.button != 0) {
        return;
      }
      setDragging(false);
    }

    function onMouseMove(e: MouseEvent) {
      if (dragging && ref.current) {
        requestAnimationFrame(() => {
          if (ref.current) {
            const divHeight = ref.current.offsetHeight;
            const mousePosition = e.clientY - ref.current.getBoundingClientRect().top;
            setVerticalPercent(mousePosition / divHeight);
          }
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

  let child1: ReactElement | undefined;
  if (children) {
    const style = { flexGrow: grow1 };
    child1 = React.cloneElement(children[0], {
      ...children[0].props,
      style: {
        ...children[0].props.style,
        ...style
      }
    });
  }

  let child2: ReactElement | undefined;
  if (children) {
    const style = { flexGrow: grow2 };
    child2 = React.cloneElement(children[1], {
      ...children[1].props,
      style: {
        ...children[1].props.style,
        ...style
      }
    });
  }

  return (
    <div ref={ref} className="flex grow flex-col" style={style}>
      {child1}
      <ColumnHandle onMouseDown={onMouseDown} />
      {child2}
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
  {className, style, id = uuidv4(), url}: {
    className?: string;
    style?: React.CSSProperties;
    id?: string;
    url?: URL;
 }
): ReactElement {
  const [splitDirection, setSplitDirection] = useState<Direction | null>(null);
  const defaultClass: string = "border-4 border-white border-opacity-50";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      const rect = ref.current?.getBoundingClientRect();
      const tileData = { id: id, rect: rect };
      window.electronAPI.send("tile-data", tileData);
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [id]);

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
        id={id}
        ref={ref}
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

  function splitLogic(tiles: ReactElement[]): ReactElement {
    const element: ReactElement = (() => {
      switch (splitDirection) {
      case Direction.Up:
        return (
          <ColumnTile style={style}>
            {tiles}
          </ColumnTile>
        );
      case Direction.Down:
        return (
          <ColumnTile style={style}>
            {tiles}
          </ColumnTile>
        );
      case Direction.Left:
        return (
          <RowTile style={style}>
            {tiles}
          </RowTile>
        );
      case Direction.Right:
        return (
          <RowTile style={style}>
            {tiles}
          </RowTile>
        );
      default:
        return <></>;
      }
    })();

    return element;
  }

  return splitDirection == null ? tileElement() : splitLogic();
}
