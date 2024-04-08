import { BrowserViewConstructorOptions } from "electron";
import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import * as channels from "../../../common/channels.ts";
import { ContextOption, Direction } from "../../../common/enums";
import { ColumnHandleProps, ColumnProps, ContextParams, RowHandleProps, RowProps, TileProps, Vector2 } from "../../../common/interfaces.ts";
import { buildTree } from "../../common/containerShared.tsx";
import { BaseNode, ColumnNode, RowNode, TileNode, TileTree, recordTile, tiles } from "../../common/nodes.tsx";
import { logError, onResize, randomColor } from "../../common/util.ts";

const colors: Record<string, string> = {};
const fileName: string = "TileApp.tsx";
let listenerRegistered: boolean = false;
let clickedPosition: Vector2;
let editModeEnabled: boolean = false;

export function TileApp(): ReactElement {
  const logOptions = {
    ts: fileName,
    fn: TileApp.name
  };
  const ref = useRef<HTMLDivElement>(null);
  const [tileTree] = useState<TileTree>(
    new TileTree(
      recordTile({
        contextBehavior: (id, params) => { onContext(id, params); },
        resizeBehavior: (id, rectangle) => { onResize(id, rectangle); }
      })
    )
  );
  const [root, setRoot] = useState<BaseNode>(tileTree.root);
  const [, forceState] = useReducer(x => x + 1, 0);

  if (!window.electronAPI.isListening(channels.toggleEditMode)) {
    window.electronAPI.on(channels.toggleEditMode, (_, ...args: unknown[]) => {
      editModeEnabled = args[0] as boolean;
    });
  }

  if (!window.electronAPI.isListening(channels.mainProcessContextMenu)) {
    window.electronAPI.on(channels.mainProcessContextMenu, (_, ...args: unknown[]) => {
      const id: string = args[0] as string;
      const params: ContextParams = args[1] as ContextParams;
      const position: Vector2 = args[2] as Vector2;
      clickedPosition = position;
      function split() {
        if (tiles[id].ref === null) {
          logError(logOptions, "ref is null");
          return;
        }
        tiles[id].split(id, params.direction as Direction);
      }
      function setUrl() {
        tiles[id].url = new URL(params.url as string);
      }
      switch (params.option) {
      case ContextOption.Split: split(); break;
      case ContextOption.Delete: break;
      case ContextOption.SetUrl: setUrl(); break;
      }
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

  function onContext(id: string, params: ContextParams) {
    const tile = tiles[id];
    function split() {
      function splitPercentY() {
        if (!ref.current) {
          logError(logOptions, "ref is invalid");
          return;
        }
        const divHeight = ref.current.offsetHeight;
        const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
        return mousePosition / divHeight;
      }
      function splitPercentX() {
        if (!ref.current) {
          logError(logOptions, "ref is invalid");
          return;
        }
        const divWidth = ref.current.offsetWidth;
        const mousePosition = clickedPosition.x - ref.current.getBoundingClientRect().left;
        return mousePosition / divWidth;
      }
      function up() {
        setRoot(new ColumnNode({
          children: [recordTile(), tile],
          initialSplit: splitPercentY(),
          forceState: forceState
        }));
      }
      function down() {
        setRoot(new ColumnNode({
          children: [tile, recordTile()],
          initialSplit: splitPercentY(),
          forceState: forceState
        }));
      }
      function left() {
        setRoot(new RowNode({
          children: [recordTile(), tile],
          initialSplit: splitPercentX(),
          forceState: forceState
        }));
      }
      function right() {
        setRoot(new RowNode({
          children: [tile, recordTile()],
          initialSplit: splitPercentX(),
          forceState: forceState
        }));
      }
      switch (params.direction) {
      case Direction.Up: up(); break;
      case Direction.Down: down(); break;
      case Direction.Left: left(); break;
      case Direction.Right: right(); break;
      }
    }
    function setUrl() {
      tile.url = new URL(params.url as string);
    }
    switch (params.option) {
    case ContextOption.Split: split(); break;
    case ContextOption.SetUrl: setUrl(); break;
    }
  }

  return (
    <div ref={ref} className="flex w-screen h-screen">
      {root.toElement()}
    </div>
  );
}

export function Row(
  { children, forceState, style, initialSplit }: RowProps
): ReactElement {
  const logOptions = {
    ts: fileName,
    fn: Row.name
  };
  const [handlePercents, setHandlePercents] = useState<number[]>(
    [initialSplit === undefined ? 0.5 : initialSplit]
  );
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  for (const child of children) {
    if (child instanceof TileNode) {
      child.setContextBehavior(onContext);
      child.setResizeBehavior(onResize);
    }
  }

  useEffect(() => {
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

  function onContext(id: string, params: ContextParams) {
    const tile = tiles[id];
    function split() {
      const parent = tile.parent as RowNode;
      const tileRef = tiles[id].ref as React.RefObject<HTMLDivElement>;
      function splitPercentY(): number {
        if (!tileRef.current) {
          logError(logOptions, "tile ref is invalid");
          return 0;
        }
        const divHeight = tileRef.current.offsetHeight;
        const mousePosition = clickedPosition.y - tileRef.current.getBoundingClientRect().top;
        return mousePosition / divHeight;
      }
      function splitPercentX(): number {
        if (!ref.current) {
          logError(logOptions, "row ref is invalid");
          return 0;
        }
        const divWidth = ref.current.offsetWidth;
        const mousePosition = clickedPosition.x - ref.current.getBoundingClientRect().left;
        return mousePosition / divWidth;
      }
      function up() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        const newColumn = new ColumnNode({
          children: [splitTile, tile],
          initialSplit: splitPercentY(),
          forceState: forceState
        });
        parent.children[tileIndex] = newColumn;
      }
      function down() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        const newColumn = new ColumnNode({
          children: [tile, splitTile],
          initialSplit: splitPercentY(),
          forceState: forceState
        });
        parent.children[tileIndex] = newColumn;
      }
      function left() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex, 0, splitTile);
        splitTile.parent = parent;
        handlePercents.splice(tileIndex, 0, splitPercentX());
      }
      function right() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        handlePercents.splice(tileIndex, 0, splitPercentX());
      }
      switch (params.direction) {
      case Direction.Up: up(); break;
      case Direction.Down: down(); break;
      case Direction.Left: left(); break;
      case Direction.Right: right(); break;
      }
      forceState();
    }
    function setUrl() {
      tiles[id].url = new URL(params.url as string);
    }
    switch (params.option) {
    case ContextOption.Split: split(); break;
    case ContextOption.Delete: break;
    case ContextOption.SetUrl: setUrl(); break;
    }
  }

  return (
    <div ref={ref} className="flex grow flex-row" style={style}>
      { buildTree(children, handlePercents, setCurrentHandle, RowHandle) }
    </div>
  );
}

export function Column(
  { children, forceState, style, initialSplit }: ColumnProps
): ReactElement {
  const logOptions = {
    ts: fileName,
    fn: Column.name
  };
  const [handlePercents, setHandlePercents] = useState<number[]>(
    [initialSplit === undefined ? 0.5 : initialSplit]
  );
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  for (const child of children) {
    if (child instanceof TileNode) {
      child.setContextBehavior(onContext);
      child.setResizeBehavior(onResize);
    }
  }

  useEffect(() => {
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

  function onContext(id: string, params: ContextParams) {
    const tile = tiles[id];
    const parent = tile.parent as ColumnNode;
    const tileRef = tiles[id].ref as React.RefObject<HTMLDivElement>;
    function splitPercentY(): number {
      if (!ref.current) {
        logError(logOptions, "column ref is invalid");
        return 0;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (!tileRef.current) {
        logError(logOptions, "tile ref is invalid");
        return 0;
      }
      const divWidth = tileRef.current.offsetWidth;
      const mousePosition = clickedPosition.x - tileRef.current.getBoundingClientRect().left;
      return mousePosition / divWidth;
    }

    function up() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      parent.children.splice(tileIndex, 0, splitTile);
      splitTile.parent = parent;
      handlePercents.splice(tileIndex, 0, splitPercentY());
      forceState();
    }
    function down() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      parent.children.splice(tileIndex + 1, 0, splitTile);
      splitTile.parent = parent;
      handlePercents.splice(tileIndex, 0, splitPercentY());
      forceState();
    }
    function left() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      const newRow = new RowNode({
        children: [splitTile, tile],
        initialSplit: splitPercentX(),
        forceState: forceState
      });
      parent.children[tileIndex] = newRow;
      forceState();
    }
    function right() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      const newRow = new RowNode({
        children: [tile, splitTile],
        initialSplit: splitPercentX(),
        forceState: forceState
      });
      parent.children[tileIndex] = newRow;
      forceState();
    }
    switch (direction) {
    case Direction.Up: up(); break;
    case Direction.Down: down(); break;
    case Direction.Left: left(); break;
    case Direction.Right: right(); break;
    }
  }

  return (
    <div ref={ref} className="flex grow flex-col" style={style}>
      { buildTree(children, handlePercents, setCurrentHandle, ColumnHandle) }
    </div>
  );
}

export function Tile({
  className,
  style,
  id,
  contextBehavior,
  resizeBehavior,
}: TileProps): ReactElement {
  const defaultClass: string = "flex-grow";
  const ref = useRef<HTMLDivElement>(null);
  const [browserViewCreated, setBrowserViewCreated] = useState<boolean>(false);

  if (!(id as string in colors)) {
    colors[id as string] = randomColor();
  }
  const color = colors[id as string];

  useEffect(() => {
    const logOptions = {
      ts: fileName,
      fn: Tile.name
    };
    tiles[id as string].ref = ref;
    if (!browserViewCreated) {
      const options: BrowserViewConstructorOptions = {
        webPreferences: {
          disableHtmlFullscreenWindowResize: true,
          enablePreferredSizeMode: true
        }
      };
      const rectangle: Electron.Rectangle = {
        x: ref.current?.offsetLeft ?? 10,
        y: ref.current?.offsetTop ?? 10,
        width: ref.current?.offsetWidth ?? 100,
        height: ref.current?.offsetHeight ?? 100
      };
      window.electronAPI.send(channels.createView, id, options);
      window.electronAPI.send(channels.setViewRectangle, id, rectangle);
      setBrowserViewCreated(true);
    }
    const resizeObserver = new ResizeObserver(() => {
      const domRect = ref.current?.getBoundingClientRect();
      if (domRect === undefined) {
        logError(logOptions, "rect is undefined");
        return;
      }
      const rectangle: Electron.Rectangle = {
        height: Math.round(domRect.height),
        width: Math.round(domRect.width),
        x: Math.round(domRect.x),
        y: Math.round(domRect.y)
      };
      if (!browserViewCreated) {
        return;
      }
      resizeBehavior?.(id as string, rectangle);
    });
    if (ref.current) {
      resizeObserver.observe(ref.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [id, browserViewCreated, resizeBehavior]);

  async function showContextMenu(): Promise<ContextParams | null> {
    return new Promise<ContextParams | null>((resolve) => {
      function listener(_event: Electron.IpcRendererEvent, ...args: unknown[]): void {
        listenerRegistered = false;
        resolve(args[0] as (ContextParams | null));
      }

      window.electronAPI.send(channels.showContextMenuAsync);
      if (!listenerRegistered) {
        window.electronAPI.once(channels.showContextMenuResponse, listener);
        listenerRegistered = true;
      }
    });
  }

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
          const params: ContextParams | null = await showContextMenu();
          if (params === null) {
            return;
          }
          contextBehavior?.(id as string, params);
        }
      }
    >
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
