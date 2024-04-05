import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import * as channels from "../../../common/channels.ts";
import { buildTree } from "../../../common/containerShared.tsx";
import { Direction } from "../../../common/enums";
import { ColumnHandleProps, ColumnProps, RowHandleProps, RowProps, TileProps, Vector2 } from "../../../common/interfaces.ts";
import { BaseNode, ColumnNode, RowNode, TileNode, TileTree, newTile, tiles } from "../../../common/nodes.tsx";
import { onResize, randomColor } from "./TileFunctions.ts";

const colors: Record<string, string> = {};
let listenerRegistered: boolean = false;
let clickedPosition: Vector2;
let clickedId: string;
let editModeEnabled: boolean = false;

export function TileApp(): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const tileProps: TileProps = {
    splitBehavior: (id, direction: Direction) => { onSplit(id, direction); },
    resizeBehavior: (id, rectangle) => { onResize(id, rectangle); }
  };
  const [tileTree] = useState<TileTree>(
    new TileTree(
      newTile(tileProps)
    )
  );
  const [root, setRoot] = useState<BaseNode>(tileTree.root);
  const [, forceState] = useReducer(x => x + 1, 0);

  if (!window.electronAPI.isListening(channels.toggleEditMode)) {
    window.electronAPI.on(channels.toggleEditMode, (_, ...args: unknown[]) => {
      editModeEnabled = args[0] as boolean;
    });
  }

  if (!window.electronAPI.isListening(channels.browserViewSplit)) {
    window.electronAPI.on(channels.browserViewSplit, (_, ...args: unknown[]) => {
      const id = args[0] as string;
      const direction = args[1] as Direction | null;
      const position = args[2] as Vector2;
      clickedPosition = position;
      clickedId = id;
      if (direction === null) {
        return;
      }
      if (tiles[id].ref === null) {
        console.error("ref is null");
        return;
      }
      tiles[id].props.splitBehavior(id, direction);
    });
  }

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      clickedPosition = { x: e.clientX, y: e.clientY };
    }

    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
    };
  });

  function onSplit(id: string, direction: Direction) {
    const tile = tiles[id];

    function splitPercentY() {
      if (!ref.current) {
        console.error("Ref is invalid");
        return;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX() {
      if (!ref.current) {
        console.error("Ref is invalid");
        return;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = clickedPosition.x - ref.current.getBoundingClientRect().left;
      return mousePosition / divWidth;
    }

    function up() {
      setRoot(new ColumnNode(
        [newTile(), tile],
        splitPercentY()
      ));
    }
    function down() {
      setRoot(new ColumnNode(
        [tile, newTile()],
        splitPercentY()
      ));
    }
    function left() {

      setRoot(new RowNode(
        [newTile(), tile],
        splitPercentX()
      ));
    }
    function right() {
      setRoot(new RowNode(
        [tile, newTile()],
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
  const tileProps: TileProps = {
    splitBehavior: (id, direction) => {
      onSplit(id, direction);
    },
    resizeBehavior: (id, rectangle) => { onResize(id, rectangle); }
  };

  useEffect(() => {
    for (const node of nodeArray) {
      if (node instanceof TileNode) {
        node.props = {
          ...node.props,
          ...tileProps
        };
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button !== 0) {
        return;
      }
      setCurrentHandle(null);
    }
    function onMouseMove(e: MouseEvent) {
      if (currentHandle !== null && ref.current) {
        const divWidth = ref.current.offsetWidth;
        const mousePosition = e.clientX - ref.current.getBoundingClientRect().left;
        const newPercents = [...handlePercents];
        newPercents[currentHandle] = mousePosition / divWidth;
        setHandlePercents(newPercents);
      }
    }
    function onContextMenu(e: MouseEvent) {
      clickedPosition = { x: e.clientX, y: e.clientY };
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  });

  function onSplit(id: string, direction: Direction,) {
    const tile = tiles[id];
    const parent = tile.parent as RowNode;
    const tileRef = tiles[id].ref!;

    function splitPercentY(): number {
      if (!tileRef.current) {
        console.error("tile ref is invalid");
        return 0;
      }
      const divHeight = tileRef.current.offsetHeight;
      const mousePosition = clickedPosition.y - tileRef.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (!ref.current) {
        console.error("row ref is invalid");
        return 0;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = clickedPosition.x - ref.current.getBoundingClientRect().left;
      console.log("div: ", divWidth);
      console.log("mouse: ", clickedPosition.x);
      return mousePosition / divWidth;
    }

    function up() {
      const tileIndex = parent.children.indexOf(tile);

      const splitTile = newTile();
      const newColumn = new ColumnNode([splitTile, tile], splitPercentY());

      parent.children[tileIndex] = newColumn;

      forceState();
    }
    function down() {
      const tileIndex = parent.children.indexOf(tile);

      const splitTile = newTile();
      const newColumn = new ColumnNode([tile, splitTile], splitPercentY());

      parent.children[tileIndex] = newColumn;

      forceState();
    }
    function left() {
      const tileIndex = parent.children.indexOf(tile);

      const splitTile = newTile();
      parent.children.splice(tileIndex, 0, splitTile);
      splitTile.parent = parent;

      handlePercents.splice(tileIndex, 0, splitPercentX());

      forceState();
    }
    function right() {
      const tileIndex = parent.children.indexOf(tile);

      const splitTile = newTile();
      parent.children.splice(tileIndex + 1, 0, splitTile);
      splitTile.parent = parent;

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
      { buildTree(tileProps, tileTree, forceState, nodeArray, handlePercents, setCurrentHandle, RowHandle) }
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
  const tileProps: TileProps = {
    splitBehavior: (id, direction) => {
      onSplit(id, direction);
    },
    resizeBehavior: (id, rectangle) => { onResize(id, rectangle); }
  };

  useEffect(() => {
    for (const node of nodeArray) {
      if (node instanceof TileNode) {
        node.props = {
          ...node.props,
          ...tileProps
        };
      }
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button !== 0) {
        return;
      }
      setCurrentHandle(null);
    }
    function onMouseMove(e: MouseEvent) {
      if (currentHandle !== null && ref.current) {
        const divHeight = ref.current.offsetHeight;
        const mousePosition = e.clientY - ref.current.getBoundingClientRect().top;
        const newPercents = [...handlePercents];
        newPercents[currentHandle] = mousePosition / divHeight;
        setHandlePercents(newPercents);
      }
    }
    function onContextMenu(e: MouseEvent) {
      clickedPosition = { x: e.clientX, y: e.clientY };
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  });

  function onSplit(id: string, direction: Direction,) {
    const tile = tiles[id];
    const parent = tile.parent as ColumnNode;
    const tileRef = tiles[id].ref!;

    function splitPercentY(): number {
      if (!ref.current) {
        console.error("column ref is invalid");
        return 0;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
      console.log("percent is ", (mousePosition / divHeight));
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (!tileRef.current) {
        console.error("tile ref is invalid");
        return 0;
      }
      const divWidth = tileRef.current.offsetWidth;
      const mousePosition = clickedPosition.x - tileRef.current.getBoundingClientRect().left;
      return mousePosition / divWidth;
    }

    function up() {
      const tileIndex = parent.children.indexOf(tile);

      const splitTile = newTile();
      parent.children.splice(tileIndex, 0, splitTile);
      splitTile.parent = parent;

      handlePercents.splice(tileIndex, 0, splitPercentY());

      forceState();
    }
    function down() {
      const tileIndex = parent.children.indexOf(tile);

      const splitTile = newTile();
      parent.children.splice(tileIndex + 1, 0, splitTile);
      splitTile.parent = parent;

      handlePercents.splice(tileIndex, 0, splitPercentY());

      forceState();
    }
    function left() {
      const tileIndex = parent.children.indexOf(tile);

      const splitTile = newTile();
      const newRow = new RowNode([splitTile, tile], splitPercentX());

      parent.children[tileIndex] = newRow;

      forceState();
    }
    function right() {
      const tileIndex = parent.children.indexOf(tile);

      const splitTile = newTile();
      const newRow = new RowNode([tile, splitTile], splitPercentX());

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
      { buildTree(tileProps, tileTree, forceState, nodeArray, handlePercents, setCurrentHandle, ColumnHandle) }
    </div>
  );
}

export function Tile({
  className,
  style,
  id,
  splitBehavior,
  resizeBehavior,
}: TileProps): ReactElement {
  const defaultClass: string = "flex-grow";
  const ref = useRef<HTMLDivElement>(null);
  const [browserViewCreated, setBrowserViewCreated] = useState<boolean>(false);
  let color: string;

  if (id !== undefined) {
    if (!(id in colors)) {
      colors[id] = randomColor();
    }
    color = colors[id];
  }

  useEffect(() => {
    tiles[id as string].ref = ref;

    if (!browserViewCreated) {
      const rectangle: Electron.Rectangle = {
        x: ref.current?.offsetLeft ?? 0,
        y: ref.current?.offsetTop ?? 0,
        width: ref.current?.offsetWidth ?? 0,
        height: ref.current?.offsetHeight ?? 0
      };
      window.electronAPI.send(channels.setBrowserView, id, rectangle);
      setBrowserViewCreated(true);
    }

    const resizeObserver = new ResizeObserver(() => {
      const domRect = ref.current?.getBoundingClientRect();
      if (domRect === undefined) {
        console.error("rect is undefined");
        return;
      }
      const rectangle: Electron.Rectangle = {
        height: Math.round(domRect.height),
        width: Math.round(domRect.width),
        x: Math.round(domRect.x),
        y: Math.round(domRect.y)
      };
      resizeBehavior?.(id as string, rectangle);
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

      window.electronAPI.send(channels.showSplitMenu);
      if (!listenerRegistered) {
        window.electronAPI.once(channels.showSplitMenuResponse, listener);
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
            clickedId = id as string;
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
