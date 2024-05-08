import { IpcRendererEvent } from "electron";
import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import { ContextOption, Direction } from "../../../common/enums.ts";
import { ColumnHandleProps, ColumnProps, ContextParams, IpcListener, RowHandleProps, RowProps, TileProps, Vector2, ViewData } from "../../../common/interfaces.ts";
import * as ich from "../../../common/ipcChannels.ts";
import * as pre from "../../../common/logPrefixes.ts";
import { buildTree, deletion, setUrl } from "../../common/containerUtil.tsx";
import * as log from "../../common/loggerUtil.ts";
import { BaseNode, ColumnNode, ContainerNode, RowNode, TileNode, TileTree, containers, recordColumn, recordRow, recordTile, tiles } from "../../common/nodeTypes.jsx";
import { resizeTicker } from "../../common/types.ts";
import { getDivRect, percentAlongRectX, percentAlongRectY, registerIpcListener, setEditMode, unregisterIpcListener } from "../../common/util.ts";
import Greeting from "./app-components/TilesGreeting.tsx";

const fileName: string = "TileApp.tsx";

export default function Main(): ReactElement {
  const logOptions = {
    ts: fileName,
    fn: Main.name
  };
  const ref = useRef<HTMLDivElement>(null);
  const [tileTree] = useState<TileTree>(
    new TileTree(
      recordTile({
        contextBehavior: onContext,
        resizeBehavior: () => {
          resizeTicker.start();
        }
      })
    )
  );
  const [root, setRoot] = useState<BaseNode>(tileTree.root);
  const [, refreshRoot] = useReducer(x => x + 1, 0);
  // #region ipc lissteners
  const toggleEditModeListener = useRef<IpcListener>({
    uuid: "392c36ba-c095-478c-adc8-735ddeac56e3",
    fn: async (_: IpcRendererEvent, ...args: unknown[]) => {
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
    },
  });
  const mainProcessContextMenuListener = useRef<IpcListener>({
    uuid: "67515752-29d6-4a1b-a3a1-3d5eaf94c565",
    fn: (_, ...args: unknown[]) => {
      // #region logging
      log.info(logOptions, `${pre.eventReceived}: ${ich.mainProcessContextMenu}`);
      // #endregion
      const tileId: string = args[0] as string;
      const params = args[1] as ContextParams | null;
      const pos: Vector2 = args[2] as Vector2;
      if (params === null) {
        return;
      }
      function split() {
        if (tiles.get(tileId)!.ref === null) {
          // #region logging
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
          // #endregion
          return;
        }
        tiles.get(tileId)!.split(pos, params!.direction as Direction);
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
    },
  });
  const debugListener = useRef<IpcListener>({
    uuid: "1c1787f8-6651-4695-bec6-a71dd6ad20b1",
    fn: () => { console.log("debug recieved"); },
  });
  const callTileContextBehaviorCCListener = useRef<IpcListener>({
    uuid: "b6b0774e-9e44-4309-8781-399938ad2deb",
    fn: (_, ...args: unknown[]) => {
      const tile = tiles.get(args[0] as string)!;
      const params = args[1] as ContextParams;
      const pos = args[2] as Vector2 | undefined;
      switch (params.option) {
      case ContextOption.Split:
        tile.split(pos!, params.direction!);
        break;
      case ContextOption.Delete: tile.delete(); break;
      }
    },
  });
  function registerListeners() {
    registerIpcListener(ich.toggleEditMode, toggleEditModeListener.current);
    registerIpcListener(ich.mainProcessContextMenu, mainProcessContextMenuListener.current);
    registerIpcListener("debug", debugListener.current);
    registerIpcListener(ich.callTileContextBehaviorCC, callTileContextBehaviorCCListener.current);
  }
  function unregisterListeners() {
    unregisterIpcListener(ich.toggleEditMode, toggleEditModeListener.current);
    unregisterIpcListener(ich.mainProcessContextMenu, mainProcessContextMenuListener.current);
    unregisterIpcListener("debug", debugListener.current);
    unregisterIpcListener(ich.callTileContextBehaviorCC, callTileContextBehaviorCCListener.current);
  }
  // #endregion

  useEffect(() => {
    registerListeners();
    return () => { unregisterListeners(); };
  });

  if (resizeTicker.refreshRoot === null) {
    resizeTicker.refreshRoot = refreshRoot;
  }

  function onContext(tileId: string, params: ContextParams, pos?: Vector2) {
    const tile = tiles.get(tileId) as TileNode;
    function split() {
      function up() {
        const percent = percentAlongRectY(getDivRect(ref.current!), pos!);
        setRoot(recordColumn({
          children: [recordTile(), tile],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: onContext
        }));
      }
      function down() {
        const percent = percentAlongRectY(getDivRect(ref.current!), pos!);
        setRoot(recordColumn({
          children: [tile, recordTile()],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: onContext
        }));
      }
      function left() {
        const percent = percentAlongRectX(getDivRect(ref.current!), pos!);
        setRoot(recordRow({
          children: [recordTile(), tile],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: onContext
        }));
      }
      function right() {
        const percent = percentAlongRectX(getDivRect(ref.current!), pos!);
        setRoot(recordRow({
          children: [tile, recordTile()],
          handlePercents: [percent],
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
    function setUrl() {
      tile.url = new URL(params.url as string);
    }
    switch (params.option) {
    case ContextOption.Split: split(); break;
    case ContextOption.SetUrl: setUrl(); break;
    case ContextOption.Delete: console.error("Can't delete root!"); break;
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
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  for (const child of children) {
    if (child instanceof TileNode) {
      child.contextBehavior = onContext;
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
      if (currentHandle !== null && ref.current !== null) {
        const divWidth = ref.current.offsetWidth;
        const mousePosition = e.clientX - ref.current.getBoundingClientRect().left;
        const newPercents = [...handlePercents];
        newPercents[currentHandle] = mousePosition / divWidth;
        containers.get(nodeId as string)!.handlePercents = newPercents;
        refreshRoot();
      }
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  });

  function onContext(tileId: string, params: ContextParams, pos?: Vector2) {
    function split() {
      const tile = tiles.get(tileId) as TileNode;
      const parent = tile.parent as RowNode;
      const tileRef = tiles.get(tileId)!.ref as React.RefObject<HTMLDivElement>;
      function up() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        const percent = percentAlongRectY(getDivRect(tileRef.current!), pos!);
        const column = recordColumn({
          children: [splitTile, tile],
          handlePercents: [percent],
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
        const percent = percentAlongRectY(getDivRect(tileRef.current!), pos!);
        const column = recordColumn({
          children: [tile, splitTile],
          handlePercents: [percent],
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
        const percent = percentAlongRectX(getDivRect(ref.current!), pos!);
        newPercents.splice(tileIndex, 0, percent);
        containers.get(nodeId as string)!.handlePercents = newPercents;
      }
      function right() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        const percent = percentAlongRectX(getDivRect(ref.current!), pos!);
        newPercents.splice(tileIndex, 0, percent);
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
    switch (params.option) {
    case ContextOption.Split: split(); break;
    case ContextOption.Delete: deletion(
        nodeId as string,
        tileId,
        refreshRoot,
        setRoot,
        rootContextBehavior
    ); break;
    case ContextOption.SetUrl: setUrl(tileId, params); break;
    }
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
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  for (const child of children) {
    if (child instanceof TileNode) {
      child.contextBehavior = onContext;
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
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  });

  function onContext(tileId: string, params: ContextParams, pos?: Vector2) {
    const tile = tiles.get(tileId) as TileNode;
    function split() {
      const parent = tile.parent as ColumnNode;
      const tileRef = tiles.get(tileId)!.ref as React.RefObject<HTMLDivElement>;

      function up() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        const percent = percentAlongRectY(getDivRect(ref.current!), pos!);
        newPercents.splice(tileIndex, 0, percent);
        containers.get(nodeId as string)!.handlePercents = newPercents;
      }
      function down() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        const percent = percentAlongRectY(getDivRect(ref.current!), pos!);
        newPercents.splice(tileIndex, 0, percent);
        containers.get(nodeId as string)!.handlePercents = newPercents;
      }
      function left() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        const percent = percentAlongRectX(getDivRect(tileRef.current!), pos!);
        const row = recordRow({
          children: [splitTile, tile],
          handlePercents: [percent],
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
        const percent = percentAlongRectX(getDivRect(tileRef.current!), pos!);
        const row = recordRow({
          children: [tile, splitTile],
          handlePercents: [percent],
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
    switch (params.option) {
    case ContextOption.Split: split(); break;
    case ContextOption.Delete: deletion(
        nodeId as string,
        tileId,
        refreshRoot,
        setRoot,
        rootContextBehavior
    ); break;
    case ContextOption.SetUrl: setUrl(tileId, params); break;
    }
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
  contextBehavior,
  resizeBehavior,
}: TileProps): ReactElement {
  const logOptions = { ts: fileName, fn: Tile.name };
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
    if (ref.current !== null) {
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
          className="flex"
          style={{
            ...style,
            backgroundRepeat: "round",
            backgroundImage: `url(${bg})`
          }}
          id={nodeId}
          ref={ref}
          onContextMenu={(e) => {
            window.electronAPI.send(
              ich.showPieMenu,
              nodeId as string,
              { x: e.screenX, y: e.screenY }
            );
          }}
        >
        </div>
      );
    }

    let divClass = "flex";
    if (style === undefined) {
      divClass += " basis-full";
    }

    switch (bg !== null) {
    case true:
      return withImg();
    default:
      return (
        <div
          id={nodeId}
          ref={ref}
          className={divClass}
          style={{...style}}
          onContextMenu={(e) => {
            window.electronAPI.send(
              ich.showPieMenu,
              nodeId as string,
              { x: e.screenX, y: e.screenY }
            );
          }}
        >
          <Greeting
            fn={(input) => { window.electronAPI.send(ich.setViewUrl, nodeId, input); }}
          >
          </Greeting>
        </div>
      );
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
