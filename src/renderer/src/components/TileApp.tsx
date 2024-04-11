import { BrowserViewConstructorOptions } from "electron";
import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import * as ch from "../../../common/channels.ts";
import { ContextOption, Direction } from "../../../common/enums";
import { ColumnHandleProps, ColumnProps, ContextParams, RowHandleProps, RowProps, TileProps, Vector2 } from "../../../common/interfaces.ts";
import * as pre from "../../../common/logPrefixes.ts";
import { buildTree } from "../../common/containerShared.tsx";
import * as log from "../../common/loggerUtil.ts";
import { BaseNode, ColumnNode, RowNode, TileNode, TileTree, recordTile, tiles } from "../../common/nodes.tsx";
import { onResize, randomColor } from "../../common/util.ts";

const colors: Record<string, string> = {};
const fileName: string = "TileApp.tsx";
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

  if (!window.electronAPI.isListening(ch.toggleEditMode)) {
    log.info(logOptions, `${pre.listeningOn}: ${ch.toggleEditMode}`);
    window.electronAPI.on(ch.toggleEditMode, (_, ...args: unknown[]) => {
      log.info(logOptions, `${pre.eventReceived}: ${ch.toggleEditMode}`);
      editModeEnabled = args[0] as boolean;
    });
  }

  if (!window.electronAPI.isListening(ch.mainProcessContextMenu)) {
    log.info(logOptions, `${pre.listeningOn}: ${ch.mainProcessContextMenu}`);
    window.electronAPI.on(ch.mainProcessContextMenu, (_, ...args: unknown[]) => {
      log.info(logOptions, `${pre.eventReceived}: ${ch.mainProcessContextMenu}`);
      const id: string = args[0] as string;
      const params: ContextParams = args[1] as ContextParams;
      const position: Vector2 = args[2] as Vector2;
      clickedPosition = position;
      function split() {
        if (tiles[id].ref === null) {
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
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
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
          return;
        }
        const divHeight = ref.current.offsetHeight;
        const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
        return mousePosition / divHeight;
      }
      function splitPercentX() {
        if (!ref.current) {
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
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
        if (tileRef.current === null) {
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref.current is null`);
          return 0;
        }
        const divHeight = tileRef.current.offsetHeight;
        const mousePosition = clickedPosition.y - tileRef.current.getBoundingClientRect().top;
        return mousePosition / divHeight;
      }
      function splitPercentX(): number {
        if (ref.current === null) {
          log.error(logOptions, `${pre.invalidValue}: Row ref is null`);
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
      if (ref.current === null) {
        log.error(logOptions, `${pre.invalidValue}: Column ref is null`);
        return 0;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (tileRef.current === null) {
        log.error(logOptions, `${pre.invalidValue}: TileNode.ref.current is null`);
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
  const logOptions = { ts: fileName, fn: Tile.name };
  const defaultClass: string = "flex-grow";
  const ref = useRef<HTMLDivElement>(null);
  const [rectangle, setRectangle] = useState<Electron.Rectangle>({
    height: 100,
    width: 100,
    x: 0,
    y: 0
  });

  if (!(id as string in colors)) {
    colors[id as string] = randomColor();
  }
  const color = colors[id as string];

  useEffect(() => {
    tiles[id as string].ref = ref;
    const resizeObserver = new ResizeObserver(() => {
      setRectangle({
        height: ref.current?.offsetHeight ?? 100,
        width: ref.current?.offsetWidth ?? 100,
        x: ref.current?.offsetLeft ?? 0,
        y: ref.current?.offsetTop ?? 0
      });
    });
    async function async() {
      if (!await window.electronAPI.invoke(ch.doesViewExist, id) as boolean) {
        await window.electronAPI.invoke(ch.createViewAsync, id, {
          webPreferences: {
            disableHtmlFullscreenWindowResize: true,
            enablePreferredSizeMode: true
          }
        });
      }
      else {
        resizeBehavior(id as string, rectangle);
      }
    }
    async();
    if (ref.current) {
      resizeObserver.observe(ref.current);
    }
    return () => {
      resizeObserver.disconnect();
    };
  }, [id, rectangle, resizeBehavior]);

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
          log.info(logOptions, `${pre.invokingEvent}: ${ch.showContextMenuAsync}`);
          const params = await window.electronAPI.invoke(ch.showContextMenuAsync) as ContextParams | null;
          if (params === null) {
            log.info(logOptions, `${pre.userInteraction}: selected Nothing (null)`);
            return;
          }
          const option: string = (() => {
            switch (params.option) {
            case ContextOption.Split: return "Split";
            case ContextOption.Delete: return "Delete";
            case ContextOption.SetUrl: return "SetUrl";
            }
          })();
          log.info(logOptions, `${pre.userInteraction}: selected ${option}`);
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
