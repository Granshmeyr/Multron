import { IpcRendererEvent } from "electron";
import React, { ReactElement, useContext, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { ContextOption, Direction } from "../../../common/enums.ts";
import { ColumnHandleProps, ColumnProps, ContextParams, IpcListener, RowHandleProps, RowProps, TileProps, Vector2, ViewData } from "../../../common/interfaces.ts";
import * as ich from "../../../common/ipcChannels.ts";
import * as pre from "../../../common/logPrefixes.ts";
import { buildTree, deletion, setUrl } from "../../common/containerUtil.tsx";
import * as Context from "../../common/contextProviders.ts";
import * as log from "../../common/loggerUtil.ts";
import { BaseNode, ColumnNode, ContainerNode, RowNode, TileNode, containers, tiles } from "../../common/nodeTypes.jsx";
import { viewRectEnforcer } from "../../common/types.ts";
import { getDivRect, percentAlongRectX, percentAlongRectY, registerIpcListener, unregisterIpcListener } from "../../common/util.ts";
import Greeting from "./app-components/TilesGreeting.tsx";

const fileName: string = "TileApp.tsx";

export default function Main(): ReactElement {
  const logOptions = { ts: fileName, fn: Main.name };
  const [borderPx, setBorderPx] = useState<number>(60);
  const [root, setRoot] = useState<BaseNode>(
    new TileNode({
      contextBehavior: onContext,
      resizeBehavior: () => viewRectEnforcer.start()
    })
  );
  const [, refreshRoot] = useReducer(x => x + 1, 0);
  const ref = useRef<HTMLDivElement>(null);
  const oldBorderPxRef = useRef<number>(-1);

  // #region ipc listeners
  const adjustBorderPxListener = useRef<IpcListener>({
    uuid: "6ff187b9-3427-4d2a-b2cf-c267dc58e78e",
    fn: (_: IpcRendererEvent, ...args: unknown[]) => {
      const delta = args[0] as number;
      let newPx: number;
      setBorderPx(v => {
        oldBorderPxRef.current = v;
        if (v === 0 && delta <= 0) newPx = v;
        else newPx = v + delta < 0 ? 0 : v + delta;
        if (newPx !== oldBorderPxRef.current) {
          window.electronAPI.send(ich.updateBorderPx, newPx!);
          window.electronAPI.send(ich.refreshAllViewBounds);
        }
        return newPx;
      });
    }
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
    fn: () => {}
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
  // #endregion
  function registerListeners() {
    registerIpcListener(ich.mainProcessContextMenu, mainProcessContextMenuListener.current);
    registerIpcListener("debug", debugListener.current);
    registerIpcListener(ich.callTileContextBehaviorCC, callTileContextBehaviorCCListener.current);
    registerIpcListener(ich.adjustBorderPx, adjustBorderPxListener.current);
  }
  function unregisterListeners() {
    unregisterIpcListener(ich.mainProcessContextMenu, mainProcessContextMenuListener.current);
    unregisterIpcListener("debug", debugListener.current);
    unregisterIpcListener(ich.callTileContextBehaviorCC, callTileContextBehaviorCCListener.current);
    unregisterIpcListener(ich.adjustBorderPx, adjustBorderPxListener.current);
  }

  useEffect(() => {
    registerListeners();
    return () => unregisterListeners();
  });

  if (viewRectEnforcer.refreshRoot === null) {
    viewRectEnforcer.refreshRoot = refreshRoot;
  }

  function onContext(tileId: string, params: ContextParams, pos?: Vector2) {
    const tile = tiles.get(tileId) as TileNode;
    function split() {
      function up() {
        const percent = percentAlongRectY(getDivRect(ref.current!), pos!);
        setRoot(new ColumnNode({
          children: [new TileNode(), tile],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: onContext
        }));
      }
      function down() {
        const percent = percentAlongRectY(getDivRect(ref.current!), pos!);
        setRoot(new ColumnNode({
          children: [tile, new TileNode()],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: onContext
        }));
      }
      function left() {
        const percent = percentAlongRectX(getDivRect(ref.current!), pos!);
        setRoot(new RowNode({
          children: [new TileNode(), tile],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: onContext
        }));
      }
      function right() {
        const percent = percentAlongRectX(getDivRect(ref.current!), pos!);
        setRoot(new RowNode({
          children: [tile, new TileNode()],
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
    <Context.BorderPx.Provider value={borderPx}>
      <div ref={ref} className="flex w-screen h-screen">
        {root.toElement()}
      </div>
    </Context.BorderPx.Provider>
  );
}

export function Row({
  children,
  refreshRoot,
  setRoot,
  rootContextBehavior,
  handlePercents,
  style,
  nodeId,
  thisNode
}: RowProps): ReactElement {
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  for (const child of children) {
    if (child instanceof TileNode) {
      child.contextBehavior = onContext;
      child.resizeBehavior = () => {
        viewRectEnforcer.start();
      };
    }
  }

  useEffect(() => {
    containers.set(nodeId, thisNode);

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
        thisNode.handlePercents = newPercents;
        refreshRoot();
      }
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      containers.delete(nodeId);
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
        const percent = percentAlongRectY(getDivRect(tileRef.current!), pos!);
        const column = new ColumnNode({
          children: [new TileNode(), tile],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: rootContextBehavior
        });
        column.parent = thisNode;
        parent.children[tileIndex] = column;
      }
      function down() {
        const tileIndex = parent.children.indexOf(tile);
        const percent = percentAlongRectY(getDivRect(tileRef.current!), pos!);
        const column = new ColumnNode({
          children: [tile, new TileNode()],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: rootContextBehavior
        });
        column.parent = thisNode;
        parent.children[tileIndex] = column;
      }
      function left() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = new TileNode();
        parent.children.splice(tileIndex, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        const percent = percentAlongRectX(getDivRect(ref.current!), pos!);
        newPercents.splice(tileIndex, 0, percent);
        thisNode.handlePercents = newPercents;
      }
      function right() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = new TileNode();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        const percent = percentAlongRectX(getDivRect(ref.current!), pos!);
        newPercents.splice(tileIndex, 0, percent);
        thisNode.handlePercents = newPercents;
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
        ref,
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
  nodeId,
  thisNode
}: ColumnProps): ReactElement {
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  for (const child of children) {
    if (child instanceof TileNode) {
      child.contextBehavior = onContext;
      child.resizeBehavior = () => {
        viewRectEnforcer.start();
      };
    }
  }

  useEffect(() => {
    containers.set(nodeId, thisNode);

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
        thisNode.handlePercents = newPercents;
        refreshRoot();
      }
    }

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      containers.delete(nodeId);
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
        const splitTile = new TileNode();
        parent.children.splice(tileIndex, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        const percent = percentAlongRectY(getDivRect(ref.current!), pos!);
        newPercents.splice(tileIndex, 0, percent);
        thisNode.handlePercents = newPercents;
      }
      function down() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = new TileNode();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        const percent = percentAlongRectY(getDivRect(ref.current!), pos!);
        newPercents.splice(tileIndex, 0, percent);
        thisNode.handlePercents = newPercents;
      }
      function left() {
        const tileIndex = parent.children.indexOf(tile);
        const percent = percentAlongRectX(getDivRect(tileRef.current!), pos!);
        const row = new RowNode({
          children: [new TileNode(), tile],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: rootContextBehavior
        });
        row.parent = thisNode;
        parent.children[tileIndex] = row;
      }
      function right() {
        const tileIndex = parent.children.indexOf(tile);
        const percent = percentAlongRectX(getDivRect(tileRef.current!), pos!);
        const row = new RowNode({
          children: [tile, new TileNode()],
          handlePercents: [percent],
          refreshRoot: refreshRoot,
          setRoot: setRoot,
          rootContextBehavior: rootContextBehavior
        });
        row.parent = thisNode;
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
        ref,
        ColumnHandle
      )}
    </div>
  );
}

export function Tile({
  style,
  nodeId,
  resizeBehavior,
  thisNode
}: TileProps): ReactElement {
  const [bg, setBg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const rectangle = useRef<Electron.Rectangle>({
    height: 100,
    width: 100,
    x: 0,
    y: 0
  });
  const borderPx = useContext(Context.BorderPx);



  useEffect(() => {
    const _logOptions = { ts: fileName, fn: `${Tile.name}/${useEffect.name}` };
    tiles.set(nodeId, thisNode);
    thisNode.ref = ref;
    thisNode.bgLoader.setter = setBg;
    async function createViewOrResizeAsync() {
      // #region logging
      log.info(_logOptions, `${pre.invokingEvent}: ${ich.getViewData} for id "${nodeId}"`);
      // #endregion
      const viewData = await window.electronAPI.invoke(ich.getViewData) as Map<string, ViewData>;
      if (!(viewData.has(nodeId))) {
        // #region logging
        log.info(_logOptions, `${pre.invokingEvent}: ${ich.createViewAsync} for id "${nodeId}"`);
        // #endregion
        await window.electronAPI.invoke(ich.createViewAsync, nodeId, {
          webPreferences: {
            disableHtmlFullscreenWindowResize: true,
            enablePreferredSizeMode: true,
          }
        });
        resizeBehavior?.(nodeId, rectangle.current);
      }
      else {
        resizeBehavior?.(nodeId, rectangle.current);
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
      tiles.delete(nodeId);
      resizeObserver.disconnect();
    };
  }, [nodeId, resizeBehavior, thisNode]);

  function element(): ReactElement {
    const n = thisNode.neighbors;
    const borderSizes = {
      borderTopWidth: n.top ? borderPx / 2 : borderPx,
      borderRightWidth: n.right ? borderPx / 2 : borderPx,
      borderBottomWidth: n.bottom ? borderPx / 2 : borderPx,
      borderLeftWidth: n.left ? borderPx / 2 : borderPx,
    };
    function withImg() {
      return (
        <div
          className="flex"
          style={{
            ...style,
            ...borderSizes,
            backgroundRepeat: "round",
            backgroundImage: `url(${bg})`
          }}
          id={nodeId}
          ref={ref}
          onContextMenu={(e) => {
            window.electronAPI.send(
              ich.showPieMenu,
              nodeId,
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
          style={{
            ...style,
            ...borderSizes
          }}
          onContextMenu={(e) => {
            window.electronAPI.send(
              ich.showPieMenu,
              nodeId,
              { x: e.screenX, y: e.screenY }
            );
          }}
        >
          <Greeting
            functions={{
              submit: (input) => { window.electronAPI.send(ich.setViewUrl, nodeId, input); }
            }}
          >
          </Greeting>
        </div>
      );
    }
  }
  return element();
}

function RowHandle({ onMouseDown, onMouseUp, containerRef }: RowHandleProps): ReactElement {
  const borderPx = useContext<number>(Context.BorderPx);
  const [heightPx, setHeightPx] = useState<number>(10);

  useLayoutEffect(() => {
    const c = containerRef.current;

    function updateHeightPx() {
      if (c !== null) {
        setHeightPx(c.offsetHeight - (borderPx * 2));
      }
    }

    updateHeightPx();
    const resizeObserver = new ResizeObserver(() => {
      if (c !== null) {
        updateHeightPx();
      }
    });
    if (c !== null) resizeObserver.observe(c);
    return () => resizeObserver.disconnect();
  }, [borderPx, containerRef]);

  return (
    <div
      className="w-0 relative"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      <div
        className="handle-row"
        style={{
          width: `${borderPx}px`,
          height: `${heightPx}px`
        }}
      />
    </div>
  );
}

function ColumnHandle({ onMouseDown, onMouseUp, containerRef }: ColumnHandleProps): ReactElement {
  const borderPx = useContext<number>(Context.BorderPx);
  const [widthPx, setWidthPx] = useState<number>(10);

  useLayoutEffect(() => {
    const c = containerRef.current;

    function updateWidthPx() {
      if (c !== null) {
        setWidthPx(c.offsetWidth - (borderPx * 2));
      }
    }

    updateWidthPx();
    const resizeObserver = new ResizeObserver(() => {
      if (c !== null) {
        updateWidthPx();
      }
    });
    if (c !== null) resizeObserver.observe(c);
    return () => resizeObserver.disconnect();
  }, [borderPx, containerRef]);

  return (
    <div
      className="h-0 relative"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
    >
      <div
        className="handle-col"
        style={{
          height: `${borderPx}px`,
          width: `${widthPx}px`
        }}
      />
    </div>
  );
}
