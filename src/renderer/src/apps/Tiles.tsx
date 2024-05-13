import { IpcRendererEvent } from "electron";
import React, { ReactElement, useContext, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { ContextOption, Direction } from "../../../common/enums.ts";
import { ColumnHandleProps, ColumnProps, ContextParams, HandleDimensions, IpcListener, Rgb, RowHandleProps, RowProps, TileProps, Vector2, ViewData } from "../../../common/interfaces.ts";
import * as ich from "../../../common/ipcChannels.ts";
import { buildTree, deletion, setUrl } from "../../common/containerUtil.tsx";
import * as Context from "../../common/contextProviders.ts";
import { BaseNode, ColumnNode, ContainerNode, RowNode, TileNode, containers, tiles } from "../../common/nodeTypes.jsx";
import { getDivRect, percentAlongRectX, percentAlongRectY, randomRgb, registerIpcListener, unregisterIpcListener } from "../../common/util.ts";
import Greeting from "./app-components/TilesGreeting.tsx";

export default function Main(): ReactElement {
  const [borderPx, setBorderPx] = useState<number>(8);
  const [borderRgb, setBorderRgb] = useState<Rgb>({ r: 255, g: 255, b: 255 });
  const [shadowRgb, setShadowRgb] = useState<Rgb>({ r: 255, g: 255, b: 255 });
  const [root, setRoot] = useState<BaseNode>(
    new TileNode(onContext)
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
      const tileId: string = args[0] as string;
      const params = args[1] as ContextParams | null;
      const pos: Vector2 = args[2] as Vector2;
      if (params === null) {
        return;
      }
      function split() {
        if (tiles.get(tileId)!.ref === null) {
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
    fn: () => {
      const rgb = randomRgb();
      setBorderRgb(rgb);
      setShadowRgb(rgb);
    }
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
    document.documentElement.style.setProperty(
      "--shadow-color",
      `rgb(${shadowRgb.r}, ${shadowRgb.g}, ${shadowRgb.b})`
    );
    return () => unregisterListeners();
  }, [shadowRgb.b, shadowRgb.g, shadowRgb.r]);

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
    <Context.BorderRgb.Provider value={borderRgb}>
      <Context.BorderPx.Provider value={borderPx}>
        <div
          className="flex w-screen h-screen inner-glow"
          ref={ref}
        >
          {root.toElement()}
        </div>
      </Context.BorderPx.Provider>
    </Context.BorderRgb.Provider>
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
        thisNode,
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
        thisNode,
        ColumnHandle
      )}
    </div>
  );
}

export function Tile({
  style,
  nodeId,
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
    tiles.set(nodeId, thisNode);
    thisNode.ref = ref;
    thisNode.bgLoader.setter = setBg;
    async function createViewOrResizeAsync() {
      const viewData = await window.electronAPI.invoke(ich.getViewData) as Map<string, ViewData>;
      if (!(viewData.has(nodeId))) {
        await window.electronAPI.invoke(ich.createViewAsync, nodeId, {
          webPreferences: {
            disableHtmlFullscreenWindowResize: true,
            enablePreferredSizeMode: true,
          }
        });
        thisNode.viewRectEnforcer.start();
      }
      else {
        thisNode.viewRectEnforcer.start();
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
  }, [nodeId, thisNode]);

  function element(): ReactElement {
    let borders: React.CSSProperties = {
      borderColor: "rgba(0, 0, 0, 0)",
      borderTopWidth: borderPx,
      borderRightWidth: borderPx,
      borderBottomWidth: borderPx,
      borderLeftWidth: borderPx,
    };

    const p = thisNode.parent;
    if (p) {
      const i = p.children.indexOf(thisNode);
      const n = p.neighbors;
      if (p instanceof RowNode) {
        const newBorders = {
          borderTopWidth: borderPx,
          borderRightWidth: borderPx / 2,
          borderBottomWidth: borderPx,
          borderLeftWidth: borderPx / 2,
        };
        if (i === 0 && !n.left) newBorders.borderLeftWidth = borderPx;
        if (n.top) newBorders.borderTopWidth = borderPx / 2;
        if (n.bottom) newBorders.borderBottomWidth = borderPx / 2;
        if (i === p.children.length - 1 && !n.right) newBorders.borderRightWidth = borderPx;
        borders = { ...borders, ...newBorders };
      }
      else if (p instanceof ColumnNode) {
        const newBorders = {
          borderTopWidth: borderPx / 2,
          borderRightWidth: borderPx,
          borderBottomWidth: borderPx / 2,
          borderLeftWidth: borderPx,
        };
        if (i === 0 && !n.top) newBorders.borderTopWidth = borderPx;
        if (n.left) newBorders.borderLeftWidth = borderPx / 2;
        if (n.right) newBorders.borderRightWidth = borderPx / 2;
        if (i === p.children.length - 1 && !n.bottom) newBorders.borderBottomWidth = borderPx;
        borders = { ...borders, ...newBorders };
      }
    }

    function withImg() {
      return (
        <div
          className="flex"
          style={{
            ...style,
            ...borders,
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
    if (!thisNode.parent) {
      divClass += " basis-full";
      delete style?.flexBasis;
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
            ...borders,
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

function RowHandle({ onMouseDown, onMouseUp, containerRef, containerNode }: RowHandleProps): ReactElement {
  const borderPx = useContext<number>(Context.BorderPx);
  const [dimensions, setDimensions] = useState({} as HandleDimensions);

  useLayoutEffect(() => {
    const c = containerRef.current;
    function updateWidthPx() {
      if (!c) return;
      let offset = 0;
      let length = c.offsetHeight;
      const n = containerNode.neighbors;
      if (n.top && n.bottom) length = length - borderPx;
      else if (n.top && !n.bottom) {
        offset = borderPx / 4;
        length = length - (borderPx / 2);
      }
      else if (!n.top && n.bottom) {
        offset = -(borderPx / 4);
        length = length - (borderPx / 2);
      }
      setDimensions({ offset: offset, length: length });
    }
    updateWidthPx();
  }, [borderPx, containerNode, containerRef]);

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
          height: `${dimensions.length}px`,
          transform: `translate(-50%, -50%) translateY(${dimensions.offset}px)`
        }}
      />
    </div>
  );
}

function ColumnHandle({ onMouseDown, onMouseUp, containerRef, containerNode }: ColumnHandleProps): ReactElement {
  const borderPx = useContext<number>(Context.BorderPx);
  const [dimensions, setDimensions] = useState({} as HandleDimensions);

  useLayoutEffect(() => {
    const c = containerRef.current;
    function updateWidthPx() {
      if (!c) return;
      let offset = 0;
      let length = c.offsetWidth;
      const n = containerNode.neighbors;
      if (n.left && n.right) length = length - borderPx;
      else if (n.left && !n.right) {
        offset = borderPx / 4;
        length = length - (borderPx / 2);
      }
      else if (!n.left && n.right) {
        offset = -(borderPx / 4);
        length = length - (borderPx / 2);
      }
      setDimensions({ offset: offset, length: length });
    }
    updateWidthPx();
  }, [borderPx, containerNode, containerRef]);

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
          width: `${dimensions.length}px`,
          transform: `translate(-50%, -50%) translateX(${dimensions.offset}px)`
        }}
      />
    </div>
  );
}
