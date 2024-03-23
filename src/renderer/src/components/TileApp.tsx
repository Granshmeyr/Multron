import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import { Direction } from "../../../common/enums";
import { RowNode, TileTree, BaseNode, TileNode, ColumnNode} from "../../../common/nodes.tsx";
import { buildContainerElements } from "../../../common/containerShared.tsx";
import { ColumnProps, TileProps, RowProps, ColumnHandleProps, RowHandleProps } from "../../../common/props";

let listenerRegistered: boolean = false;
let contextEvent: MouseEvent;
let clickedTileRef: React.RefObject<HTMLDivElement>;

export function TileApp(): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const behaviorProps: TileProps = {
    splitBehavior: (id, direction: Direction) => { onSplit(id, direction); },
    resizeBehavior: (id, rect) => { onResize(id, rect); }
  };
  const [tileTree] = useState<TileTree>(
    new TileTree(
      new TileNode({ ...behaviorProps })
    )
  );
  const [root, setRoot] = useState<BaseNode>(tileTree.root);
  const [, forceState] = useReducer(x => x + 1, 0);

  useEffect(() => {
    function onContextMenu(e: MouseEvent) { contextEvent = e; }

    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
    };
  });

  function onSplit(id: string, direction: Direction) {
    const tile = tileTree.record[id];

    function up() {
      if (!ref.current) {
        console.error("Ref is invalid");
        return;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = contextEvent.clientY - ref.current.getBoundingClientRect().top;
      const splitPercent = mousePosition / divHeight;
      setRoot(new ColumnNode(
        tileTree,
        forceState,
        [tileTree.newTile(behaviorProps), tile],
        splitPercent
      ));
    }

    function down() {
      if (!ref.current) {
        console.error("Ref is invalid");
        return;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = contextEvent.clientY - ref.current.getBoundingClientRect().top;
      const splitPercent = mousePosition / divHeight;
      setRoot(new ColumnNode(
        tileTree,
        forceState,
        [tile, tileTree.newTile(behaviorProps)],
        splitPercent
      ));
    }

    function left() {
      if (!ref.current) {
        console.error("Ref is invalid");
        return;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = contextEvent.clientX - ref.current.getBoundingClientRect().left;
      const splitPercent = mousePosition / divWidth;
      setRoot(new RowNode(
        tileTree,
        forceState,
        [tileTree.newTile(behaviorProps), tile],
        splitPercent
      ));
    }

    function right() {
      if (!ref.current) {
        console.error("Ref is invalid");
        return;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = contextEvent.clientX - ref.current.getBoundingClientRect().left;
      const splitPercent = mousePosition / divWidth;
      setRoot(new RowNode(
        tileTree,
        forceState,
        [tile, tileTree.newTile(behaviorProps)],
        splitPercent
      ));
    }

    switch (direction) {
    case Direction.Up: up(); return;
    case Direction.Down: down(); return;
    case Direction.Left: left(); return;
    case Direction.Right: right(); return;
    }
  }

  function onResize(id: string, rect: DOMRect) {
    return { id, rect };
  }

  return (
    <div ref={ref} className="flex w-screen h-screen">
      {root.toElement()}
    </div>
  );
}

export function Row(
  { tileTree, children, forceState, style, initialSplit }: RowProps
): ReactElement {
  const [handlePercents, setHandlePercents] = useState<number[]>(
    [initialSplit === undefined ? 0.5 : initialSplit]
  );
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const behaviorProps: TileProps = {
    splitBehavior: (id, direction) => {
      onSplit(id, direction);
    },
    resizeBehavior: (id, rect) => { return {id, rect}; }
  };

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (e.button !== 0) {
        return;
      }
      setCurrentHandle(null);
    }
    function onMouseMove(e: MouseEvent) {
      if (currentHandle !== null && ref.current) {
        requestAnimationFrame(() => {
          if (ref.current) {
            const divWidth = ref.current.offsetWidth;
            const mousePosition = e.clientX - ref.current.getBoundingClientRect().left;
            const newPercents = [...handlePercents];
            newPercents[currentHandle] = mousePosition / divWidth;
            setHandlePercents(newPercents);
          }
        });
      }
    }
    function onContextMenu(e: MouseEvent) { contextEvent = e; }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [currentHandle, handlePercents]);

  function onSplit(id: string, direction: Direction,) {
    const tile = tileTree.record[id];
    const parent = tile.parent as RowNode;

    function up() {
      const tileIndex = parent.children.indexOf(tile);

      if (!clickedTileRef.current) {
        console.error("clickedTileRef is invalid");
        return;
      }
      const divHeight = clickedTileRef.current.offsetHeight;
      const mousePosition = contextEvent.clientY - clickedTileRef.current.getBoundingClientRect().top;
      const splitPercent = mousePosition / divHeight;

      const newTile = tileTree.newTile(behaviorProps);
      const newColumn = new ColumnNode(tileTree, forceState, [newTile, tile], splitPercent);

      parent.children[tileIndex] = newColumn;

      forceState();
    }

    function down() {
      const tileIndex = parent.children.indexOf(tile);

      if (!clickedTileRef.current) {
        console.error("clickedTileRef is invalid");
        return;
      }
      const divHeight = clickedTileRef.current.offsetHeight;
      const mousePosition = contextEvent.clientY - clickedTileRef.current.getBoundingClientRect().top;
      const splitPercent = mousePosition / divHeight;

      const newTile = tileTree.newTile(behaviorProps);
      const newColumn = new ColumnNode(tileTree, forceState, [tile, newTile], splitPercent);

      parent.children[tileIndex] = newColumn;

      forceState();
    }

    function left() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(behaviorProps);
      parent.children.splice(tileIndex, 0, newTile);
      newTile.parent = parent;

      if (!ref.current) {
        console.log("Ref is invalid");
        return;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = contextEvent.clientX - ref.current.getBoundingClientRect().left;
      const splitPercent = mousePosition / divWidth;
      handlePercents.splice(tileIndex, 0, splitPercent);

      forceState();
    }

    function right() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(behaviorProps);
      parent.children.splice(tileIndex + 1, 0, newTile);
      newTile.parent = parent;

      if (!ref.current) {
        console.log("Ref is invalid");
        return;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = contextEvent.clientX - ref.current.getBoundingClientRect().left;
      const splitPercent = mousePosition / divWidth;
      handlePercents.splice(tileIndex, 0, splitPercent);

      forceState();
    }

    switch (direction) {
    case Direction.Up: up(); return;
    case Direction.Down: down(); return;
    case Direction.Left: left(); return;
    case Direction.Right: right(); return;
    }
  }

  return (
    <div ref={ref} className="flex grow flex-row" style={style}>
      { buildContainerElements(children, behaviorProps, handlePercents, setCurrentHandle, RowHandle) }
    </div>
  );
}

export function Column(
  { tileTree, children, forceState, style, initialSplit }: ColumnProps
): ReactElement {
  const [handlePercents, setHandlePercents] = useState<number[]>(
    [initialSplit === undefined ? 0.5 : initialSplit]
  );
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const behaviorProps: TileProps = {
    splitBehavior: (id, direction: Direction) => {
      onSplit(id, direction, tileTree, behaviorProps, ref, contextEvent, handlePercents, forceState);
    },
    resizeBehavior: (id, rect) => { return {id,rect}; }
  };

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if (e.button !== 0) {
        return;
      }
      setCurrentHandle(null);
    }
    function onMouseMove(e: MouseEvent) {
      if (currentHandle !== null && ref.current) {
        requestAnimationFrame(() => {
          if (ref.current) {
            const divHeight = ref.current.offsetHeight;
            const mousePosition = e.clientY - ref.current.getBoundingClientRect().top;
            const newPercents = [...handlePercents];
            newPercents[currentHandle] = mousePosition / divHeight;
            setHandlePercents(newPercents);
          }
        });
      }
    }
    function onContextMenu(e: MouseEvent) { contextEvent = e; }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [currentHandle, handlePercents]);

  return (
    <div ref={ref} className="flex grow flex-col" style={style}>
      { buildContainerElements(children, behaviorProps, handlePercents, setCurrentHandle, ColumnHandle) }
    </div>
  );
}

function RowHandle({ onMouseDown }: RowHandleProps): ReactElement {
  return (
    <div className="w-0 relative" onMouseDown={onMouseDown}>
      <div className="handle-row"></div>
    </div>
  );
}

function ColumnHandle({ onMouseDown }: ColumnHandleProps): ReactElement {
  return (
    <div className="h-0 relative" onMouseDown={onMouseDown}>
      <div className="handle-col"></div>
    </div>
  );
}

export function Tile(props: TileProps): ReactElement {
  const defaultClass: string = "border-4 border-white border-opacity-50 flex-grow";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect === undefined) {
        console.error("rect is undefined");
        return;
      }
      props.resizeBehavior?.(props.id as string, rect);
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  });

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
        className={`${defaultClass} ${props.className}`}
        style={props.style}
        id={props.id}
        ref={ref}
        onContextMenu={
          async () => {
            clickedTileRef = ref;
            const direction: Direction | null = await showSplitMenu();
            if (direction === null) {
              return;
            }
            props.splitBehavior?.(props.id as string, direction);
          }
        }
      >
      </div>
    );
  }

  return tileElement();
}
