import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import { ContextOption, Direction } from "../../../common/enums.ts";
import { ColumnHandleProps, ColumnProps, ContextParams, RowHandleProps, RowProps, TileProps, Vector2, ViewData } from "../../../common/interfaces.ts";
import * as ich from "../../../common/ipcChannels.ts";
import * as pre from "../../../common/logPrefixes.ts";
import { buildTree, deletion, setUrl } from "../../common/containerUtil.tsx";
import * as log from "../../common/loggerUtil.ts";
import { BaseNode, ContainerNode, RowNode, TileNode, TileTree, containers, recordColumn, recordRow, recordTile, tiles } from "../../common/nodeTypes.jsx";
import { resizeTicker } from "../../common/types.ts";
import { setEditMode } from "../../common/util.ts";
import Greeting from "./app-components/TilesGreeting.tsx";

const fileName: string = "TileApp.tsx";
let clickedPosition: Vector2;

export default function Main(): ReactElement {
  const logOptions = {
    ts: fileName,
    fn: Main.name
  };
  const ref = useRef<HTMLDivElement>(null);
  const [tileTree] = useState<TileTree>(
    new TileTree(
      recordTile({
        resizeBehavior: () => {
          resizeTicker.start();
        }
      })
    )
  );
  const [root, setRoot] = useState<BaseNode>(tileTree.root);
  const [, refreshRoot] = useReducer(x => x + 1, 0);

  if (resizeTicker.refreshRoot === null) {
    resizeTicker.refreshRoot = refreshRoot;
  }

  if (!window.electronAPI.isListening(ich.toggleEditMode)) {
    // #region logging
    log.info(logOptions, `${pre.listeningOn}: ${ich.toggleEditMode}`);
    // #endregion
    window.electronAPI.on(ich.toggleEditMode, async (_, ...args: unknown[]) => {
      // #region logging
      log.info(logOptions, `${pre.eventReceived}: ${ich.toggleEditMode}`);
      // #endregion
      const enabled = args[0] as boolean;
      setEditMode(enabled);
      function enterEditMode() {
        resizeTicker.tickAsync();
      }
      function exitEditMode() {
      }
      switch (enabled) {
      case true: enterEditMode(); break;
      default: exitEditMode(); break;
      }
    });
  }
  if (!window.electronAPI.isListening(ich.mainProcessContextMenu)) {
    // #region logging
    log.info(logOptions, `${pre.listeningOn}: ${ich.mainProcessContextMenu}`);
    // #endregion
    window.electronAPI.on(ich.mainProcessContextMenu, (_, ...args: unknown[]) => {
      // #region logging
      log.info(logOptions, `${pre.eventReceived}: ${ich.mainProcessContextMenu}`);
      // #endregion
      const tileId: string = args[0] as string;
      const params = args[1] as ContextParams | null;
      const position: Vector2 = args[2] as Vector2;
      if (params === null) {
        return;
      }
      clickedPosition = position;
      function split() {
        if (tiles.get(tileId)!.ref === null) {
          // #region logging
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
          // #endregion
          return;
        }
        tiles.get(tileId)!.split(tileId, params!.direction as Direction);
      }
      switch (params.option) {
      case ContextOption.Split: split(); break;
      case ContextOption.Delete: (
        () => {
          const parent = tiles.get(tileId)!.parent as ContainerNode | null;
          if (parent === null) { return; }
          deletion(
            parent.nodeId,
            tileId,
            parent.refreshRoot,
            parent.setRoot,
            parent.rootContextBehavior
          );
        })();
        break;
      case ContextOption.SetUrl: setUrl(tileId, params); break;
      }
    });
  }
  if (!window.electronAPI.isListening("debug")) {
    window.electronAPI.on("debug", () => {
      console.log("debug invoked");
    });
  }

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      clickedPosition = { x: e.clientX, y: e.clientY };
    }
    function onMouseUp(e: MouseEvent) {
      if (e.button !== 0) {
        return;
      }
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseup", onMouseUp);
    };
  });

  function split() {
    const tile = tiles.get(tileId) as TileNode;
    function splitPercentY(): number {
      if (!ref.current) {
        // #region logging
        log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
        // #endregion
        return 0.1;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (!ref.current) {
        // #region logging
        log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
        // #endregion
        return 0.1;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = clickedPosition.x - ref.current.getBoundingClientRect().left;
      return mousePosition / divWidth;
    }
    function up() {
      setRoot(recordColumn({
        children: [recordTile(), tile],
        handlePercents: [splitPercentY()],
        refreshRoot: refreshRoot,
        setRoot: setRoot,
        rootContextBehavior: onContext
      }));
    }
    function down() {
      setRoot(recordColumn({
        children: [tile, recordTile()],
        handlePercents: [splitPercentY()],
        refreshRoot: refreshRoot,
        setRoot: setRoot,
        rootContextBehavior: onContext
      }));
    }
    function left() {
      setRoot(recordRow({
        children: [recordTile(), tile],
        handlePercents: [splitPercentX()],
        refreshRoot: refreshRoot,
        setRoot: setRoot,
        rootContextBehavior: onContext
      }));
    }
    function right() {
      setRoot(recordRow({
        children: [tile, recordTile()],
        handlePercents: [splitPercentX()],
        refreshRoot: refreshRoot,
        setRoot: setRoot,
        rootContextBehavior: onContext
      }));
    }
    switch (params.direction) {
    case Direction.Up: up(); break;
    case Direction.Down: down(); break;
    case Direction.Left: left(); break;
    case Direction.Right: right(); break;
    }
  }

  return (
    <div ref={ref} className="flex w-screen h-screen">
      {root.toElement()}
    </div>
  );
}

export function Row({
  children,
  refreshRoot,
  setRoot,
  rootContextBehavior,
  handlePercents,
  style,
  nodeId
}: RowProps): ReactElement {
  const logOptions = { ts: fileName, fn: Row.name };
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  for (const child of children) {
    if (child instanceof TileNode) {
      child.resizeBehavior = () => {
        resizeTicker.start();
      };
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
        containers.get(nodeId as string)!.handlePercents = newPercents;
        refreshRoot();
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

  function onSplit(tileId: string, params: ContextParams) {
    const tile = tiles.get(tileId) as TileNode;
    const parent = tile.parent as RowNode;
    const tileRef = tiles.get(tileId)!.ref as React.RefObject<HTMLDivElement>;
    function splitPercentY(): number {
      if (tileRef.current === null) {
        // #region logging
        log.error(logOptions, `${pre.invalidValue}: TileNode.ref.current is null`);
        // #endregion
        return 0.1;
      }
      const divHeight = tileRef.current.offsetHeight;
      const mousePosition = clickedPosition.y - tileRef.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (ref.current === null) {
        // #region logging
        log.error(logOptions, `${pre.invalidValue}: Row ref is null`);
        // #endregion
        return 0.1;
      }
      const divWidth = ref.current.offsetWidth;
      const mousePosition = clickedPosition.x - ref.current.getBoundingClientRect().left;
      return mousePosition / divWidth;
    }
    function up() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      const column = recordColumn({
        children: [splitTile, tile],
        handlePercents: [splitPercentY()],
        refreshRoot: refreshRoot,
        setRoot: setRoot,
        rootContextBehavior: rootContextBehavior
      });
      column.parent = containers.get(nodeId as string)!;
      parent.children[tileIndex] = column;
    }
    function down() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      const column = recordColumn({
        children: [tile, splitTile],
        handlePercents: [splitPercentY()],
        refreshRoot: refreshRoot,
        setRoot: setRoot,
        rootContextBehavior: rootContextBehavior
      });
      column.parent = containers.get(nodeId as string)!;
      parent.children[tileIndex] = column;
    }
    function left() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      parent.children.splice(tileIndex, 0, splitTile);
      splitTile.parent = parent;
      const newPercents = [...handlePercents];
      newPercents.splice(tileIndex, 0, splitPercentX());
        containers.get(nodeId as string)!.handlePercents = newPercents;
    }
    function right() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      parent.children.splice(tileIndex + 1, 0, splitTile);
      splitTile.parent = parent;
      const newPercents = [...handlePercents];
      newPercents.splice(tileIndex, 0, splitPercentX());
        containers.get(nodeId as string)!.handlePercents = newPercents;
    }
    switch (params.direction) {
    case Direction.Up: up(); break;
    case Direction.Down: down(); break;
    case Direction.Left: left(); break;
    case Direction.Right: right(); break;
    }
    refreshRoot();
  }

  return (
    <div
      ref={ref}
      className="flex grow flex-row"
      style={style}
      id={nodeId}
    >
      {buildTree(
        children,
        handlePercents,
        setCurrentHandle,
        RowHandle
      )}
    </div>
  );
}

export function Column({
  children,
  refreshRoot,
  setRoot,
  rootContextBehavior,
  handlePercents,
  style,
  nodeId
}: ColumnProps): ReactElement {
  const logOptions = { ts: fileName, fn: Column.name };
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  for (const child of children) {
    if (child instanceof TileNode) {
      child.resizeBehavior = () => {
        resizeTicker.start();
      };
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
        containers.get(nodeId as string)!.handlePercents = newPercents;
        refreshRoot();
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

  function split(tileId: string, params: ContextParams) {
    const tile = tiles.get(tileId) as TileNode;
    const parent = tile.parent as RowNode;
    const tileRef = tiles.get(tileId)!.ref as React.RefObject<HTMLDivElement>;
    function splitPercentY(): number {
      if (ref.current === null) {
        // #region logging
        log.error(logOptions, `${pre.invalidValue}: Column ref is null`);
        // #endregion
        return 0;
      }
      const divHeight = ref.current.offsetHeight;
      const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
      return mousePosition / divHeight;
    }
    function splitPercentX(): number {
      if (tileRef.current === null) {
        // #region logging
        log.error(logOptions, `${pre.invalidValue}: TileNode.ref.current is null`);
        // #endregion
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
      const newPercents = [...handlePercents];
      newPercents.splice(tileIndex, 0, splitPercentY());
      containers.get(nodeId as string)!.handlePercents = newPercents;
    }
    function down() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      parent.children.splice(tileIndex + 1, 0, splitTile);
      splitTile.parent = parent;
      const newPercents = [...handlePercents];
      newPercents.splice(tileIndex, 0, splitPercentY());
      containers.get(nodeId as string)!.handlePercents = newPercents;
    }
    function left() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      const row = recordRow({
        children: [splitTile, tile],
        handlePercents: [splitPercentX()],
        refreshRoot: refreshRoot,
        setRoot: setRoot,
        rootContextBehavior: rootContextBehavior
      });
      row.parent = containers.get(nodeId as string)!;
      parent.children[tileIndex] = row;
    }
    function right() {
      const tileIndex = parent.children.indexOf(tile);
      const splitTile = recordTile();
      const row = recordRow({
        children: [tile, splitTile],
        handlePercents: [splitPercentX()],
        refreshRoot: refreshRoot,
        setRoot: setRoot,
        rootContextBehavior: rootContextBehavior
      });
      row.parent = containers.get(nodeId as string)!;
      parent.children[tileIndex] = row;
    }
    switch (params.direction) {
    case Direction.Up: up(); break;
    case Direction.Down: down(); break;
    case Direction.Left: left(); break;
    case Direction.Right: right(); break;
    }
    refreshRoot();
  }

  return (
    <div
      ref={ref}
      className="flex grow flex-col"
      style={style}
      id={nodeId}
    >
      {buildTree(
        children,
        handlePercents,
        setCurrentHandle,
        ColumnHandle
      )}
    </div>
  );
}

export function Tile({
  style,
  nodeId,
  resizeBehavior,
}: TileProps): ReactElement {
  const [bg, setBg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const rectangle = useRef<Electron.Rectangle>({
    height: 100,
    width: 100,
    x: 0,
    y: 0
  });

  tiles.get(nodeId as string)!.bgLoader.setter = setBg;

  useEffect(() => {
    const _logOptions = { ts: fileName, fn: `${Tile.name}/${useEffect.name}` };
  tiles.get(nodeId as string)!.ref = ref;
  async function createViewOrResizeAsync() {
    // #region logging
    log.info(_logOptions, `${pre.invokingEvent}: ${ich.getViewData} for id "${nodeId}"`);
    // #endregion
    const viewData = await window.electronAPI.invoke(ich.getViewData) as Map<string, ViewData>;
    if (!(viewData.has(nodeId as string))) {
      // #region logging
      log.info(_logOptions, `${pre.invokingEvent}: ${ich.createViewAsync} for id "${nodeId}"`);
      // #endregion
      await window.electronAPI.invoke(ich.createViewAsync, nodeId, {
        webPreferences: {
          disableHtmlFullscreenWindowResize: true,
          enablePreferredSizeMode: true,
        }
      });
      resizeBehavior(nodeId as string, rectangle.current);
    }
    else {
      resizeBehavior(nodeId as string, rectangle.current);
    }
  }
  const resizeObserver = new ResizeObserver(async () => {
    rectangle.current = {
      height: ref.current?.offsetHeight ?? 100,
      width: ref.current?.offsetWidth ?? 100,
      x: ref.current?.offsetLeft ?? 0,
      y: ref.current?.offsetTop ?? 0
    };
    createViewOrResizeAsync();
  });
  createViewOrResizeAsync();
  if (ref.current) {
    resizeObserver.observe(ref.current);
  }
  return () => {
    resizeObserver.disconnect();
  };
  }, [nodeId, resizeBehavior]);

  function element(): ReactElement {
    function withImg() {
      return (
        <div
          className="flex-grow"
          style={{
            ...style,
            backgroundRepeat: "round",
            backgroundImage: `url(${bg})`
          }}
          ref={ref}
        >
        </div>
      );
    }
    switch (bg !== null) {
    case true:
      return withImg();
    default:
      return <Greeting nodeId={`${nodeId as string}`} ref={ref}></Greeting>;
    }
  }
  return element();
}

function RowHandle({ onMouseDown, onMouseUp }: RowHandleProps): ReactElement {
  return (
    <div
      className="w-0 relative"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      <div className="handle-row"></div>
    </div>
  );
}

function ColumnHandle({ onMouseDown, onMouseUp }: ColumnHandleProps): ReactElement {
  return (
    <div
      className="h-0 relative"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      <div className="handle-col"></div>
    </div>
  );
}
