import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import { buildTree } from "../../../common/containerShared.tsx";
import { Direction } from "../../../common/enums";
import { BaseNode, ColumnNode, RowNode, TileNode, TileTree } from "../../../common/nodes.tsx";
import { ColumnHandleProps, ColumnProps, RowHandleProps, RowProps, TileBehaviors, TileProps } from "../../../common/props";

let listenerRegistered: boolean = false;
let lastMouseEvent: MouseEvent;
let clickedTileRef: React.RefObject<HTMLDivElement>;
const colors: Record<string, string> = {};

export function TileApp(): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const tileBehaviors: TileBehaviors = {
    splitBehavior: (id, direction: Direction) => { onSplit(id, direction); },
    resizeBehavior: (id, rect) => { onResize(id, rect); }
  };
  const [tileTree] = useState<TileTree>(
    new TileTree(
      new TileNode(tileBehaviors)
    )
  );

  const [root, setRoot] = useState<BaseNode>(tileTree.root);
  const [, forceState] = useReducer(x => x + 1, 0);

  useEffect(() => {
    function onContextMenu(e: MouseEvent) { lastMouseEvent = e; }

    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
    };
  });

  function onSplit(id: string, direction: Direction) {
    const tile = tileTree.nodeRecord[id];

    function splitPercentY() {
      if (!ref.current) {
        console.error("Ref is invalid");
        return;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = lastMouseEvent.clientY - ref.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX() {
      if (!ref.current) {
        console.error("Ref is invalid");
        return;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = lastMouseEvent.clientX - ref.current.getBoundingClientRect().left;
      return mousePosition / divWidth;
    }

    function up() {
      setRoot(new ColumnNode(
        [tileTree.newTile(tileBehaviors), tile],
        splitPercentY()
      ));
    }
    function down() {
      setRoot(new ColumnNode(
        [tile, tileTree.newTile(tileBehaviors)],
        splitPercentY()
      ));
    }
    function left() {

      setRoot(new RowNode(
        [tileTree.newTile(tileBehaviors), tile],
        splitPercentX()
      ));
    }
    function right() {
      setRoot(new RowNode(
        [tile, tileTree.newTile(tileBehaviors)],
        splitPercentX()
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
      {(() => {
        if (root instanceof TileNode) {
          return <Tile
            {...root.props}
          ></Tile>;
        }
        else if (root instanceof RowNode) {
          return <Row
            nodeArray={root.children}
            tileTree={tileTree}
            forceState={forceState}
            initialSplit={root.initialSplit}
          ></Row>;
        }
        else if (root instanceof ColumnNode) {
          return <Column
            nodeArray={root.children}
            tileTree={tileTree}
            forceState={forceState}
            initialSplit={root.initialSplit}
          ></Column>;
        }
      })()}
    </div>
  );
}

export function Row(
  { tileTree, nodeArray, forceState, style, initialSplit }: RowProps
): ReactElement {
  const [handlePercents, setHandlePercents] = useState<number[]>(
    [initialSplit === undefined ? 0.5 : initialSplit]
  );
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tileBehaviors: TileBehaviors = {
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
    function onContextMenu(e: MouseEvent) { lastMouseEvent = e; }

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
    const tile = tileTree.nodeRecord[id];
    const parent = tile.parent as RowNode;

    function splitPercentY(): number {
      if (!clickedTileRef.current) {
        console.error("clickedTileRef is invalid");
        return 0;
      }
      const divHeight = clickedTileRef.current.offsetHeight;
      const mousePosition = lastMouseEvent.clientY - clickedTileRef.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (!ref.current) {
        console.error("Ref is invalid");
        return 0;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = lastMouseEvent.clientX - ref.current.getBoundingClientRect().left;
      return mousePosition / divWidth;
    }

    function up() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(tileBehaviors);
      const newColumn = new ColumnNode([newTile, tile], splitPercentY());

      parent.children[tileIndex] = newColumn;

      forceState();
    }
    function down() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(tileBehaviors);
      const newColumn = new ColumnNode([tile, newTile], splitPercentY());

      parent.children[tileIndex] = newColumn;

      forceState();
    }
    function left() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(tileBehaviors);
      parent.children.splice(tileIndex, 0, newTile);
      newTile.parent = parent;

      handlePercents.splice(tileIndex, 0, splitPercentX());

      forceState();
    }
    function right() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(tileBehaviors);
      parent.children.splice(tileIndex + 1, 0, newTile);
      newTile.parent = parent;

      handlePercents.splice(tileIndex, 0, splitPercentX());

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
      { buildTree(tileTree, forceState, nodeArray, tileBehaviors, handlePercents, setCurrentHandle, RowHandle) }
    </div>
  );
}

export function Column(
  { tileTree, nodeArray, forceState, style, initialSplit }: ColumnProps
): ReactElement {
  const [handlePercents, setHandlePercents] = useState<number[]>(
    [initialSplit === undefined ? 0.5 : initialSplit]
  );
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const tileBehaviors: TileBehaviors = {
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
            const divHeight = ref.current.offsetHeight;
            const mousePosition = e.clientY - ref.current.getBoundingClientRect().top;
            const newPercents = [...handlePercents];
            newPercents[currentHandle] = mousePosition / divHeight;
            setHandlePercents(newPercents);
          }
        });
      }
    }
    function onContextMenu(e: MouseEvent) { lastMouseEvent = e; }

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
    const tile = tileTree.nodeRecord[id];
    const parent = tile.parent as ColumnNode;

    function splitPercentY(): number {
      if (!ref.current) {
        console.error("Ref is invalid");
        return 0;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = lastMouseEvent.clientY - ref.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (!clickedTileRef.current) {
        console.error("clickedTileRef is invalid");
        return 0;
      }
      const divWidth = clickedTileRef.current.offsetWidth;
      const mousePosition = lastMouseEvent.clientX - clickedTileRef.current.getBoundingClientRect().left;
      return mousePosition / divWidth;
    }

    function up() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(tileBehaviors);
      parent.children.splice(tileIndex, 0, newTile);
      newTile.parent = parent;

      handlePercents.splice(tileIndex, 0, splitPercentY());

      forceState();
    }
    function down() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(tileBehaviors);
      parent.children.splice(tileIndex + 1, 0, newTile);
      newTile.parent = parent;

      handlePercents.splice(tileIndex, 0, splitPercentY());

      forceState();
    }
    function left() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(tileBehaviors);
      const newRow = new RowNode([newTile, tile], splitPercentX());

      parent.children[tileIndex] = newRow;

      forceState();
    }
    function right() {
      const tileIndex = parent.children.indexOf(tile);

      const newTile = tileTree.newTile(tileBehaviors);
      const newRow = new RowNode([tile, newTile], splitPercentX());

      parent.children[tileIndex] = newRow;

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
    <div ref={ref} className="flex grow flex-col" style={style}>
      { buildTree(tileTree, forceState, nodeArray, tileBehaviors, handlePercents, setCurrentHandle, ColumnHandle) }
    </div>
  );
}

export function Tile({
  className,
  style,
  id,
  splitBehavior,
  resizeBehavior
}: TileProps): ReactElement {
  const defaultClass: string = "flex-grow";
  const ref = useRef<HTMLDivElement>(null);
  const [browserViewCreated, setBrowserViewCreated] = useState<boolean>(false);

  if (!(id in colors)) {
    colors[id] = randomColor();
  }
  const color = colors[id];

  useEffect(() => {
    if (!browserViewCreated) {
      const rectangle: Electron.Rectangle = {
        x: ref.current?.offsetLeft ?? 0,
        y: ref.current?.offsetTop ?? 0,
        width: ref.current?.offsetWidth ?? 0,
        height: ref.current?.offsetHeight ?? 0
      };
      window.electronAPI.send("set-browser-view", id, rectangle);
      setBrowserViewCreated(true);
    }

    const resizeObserver = new ResizeObserver(() => {
      const rect = ref.current?.getBoundingClientRect();
      if (rect === undefined) {
        console.error("rect is undefined");
        return;
      }
      resizeBehavior?.(id as string, rect);
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [browserViewCreated, resizeBehavior, id]);

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
        className={(() => {
          if (className !== undefined) {
            return defaultClass + " " + className;
          }
          return defaultClass;
        })()}
        style={{ ...style, backgroundColor: color }}
        id={id}
        ref={ref}
        onContextMenu={
          async () => {
            clickedTileRef = ref;
            const direction: Direction | null = await showSplitMenu();
            if (direction === null) {
              return;
            }
            splitBehavior?.(id as string, direction);
          }
        }
      >
      </div>
    );
  }

  return tileElement();
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

// https://stackoverflow.com/questions/1484506/random-color-generator#comment18632055_5365036
function randomColor() {
  return "#" + ("00000"+(Math.random()*(1<<24)|0).toString(16)).slice(-6);
}