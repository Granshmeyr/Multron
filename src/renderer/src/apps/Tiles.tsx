import { IpcRendererEvent } from "electron";
import React, { ReactElement, useContext, useEffect, useReducer, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ContextOption, Direction } from "../../../common/enums.ts";
import { ColumnHandleProps, ColumnProps, ContextParams, IpcListener, Rgba, RowHandleProps, RowProps, TileProps, Vector2, ViewData } from "../../../common/interfaces.ts";
import * as ich from "../../../common/ipcChannels.ts";
import { buildTree, deletion, setUrl } from "../../common/containerUtil.tsx";
import * as Context from "../../common/contextProviders.ts";
import { BaseNode, ColumnNode, ContainerNode, RowNode, TileNode, containers, tiles } from "../../common/nodeTypes.jsx";
import { getDivRect, percentAlongRectX, percentAlongRectY, randomRgba, registerIpcListener, rgbaAsCss, rgbaToHexa, unregisterIpcListener } from "../../common/util.ts";
import Greeting from "./app-components/TilesGreeting.tsx";

const colors = new Map<string, Rgba>();

export default function Main(): ReactElement {
  const [borderPx, setBorderPx] = useState<number>(8);
  const [borderRgba, setBorderRgba] = useState<Rgba>({ r: 10, g: 132, b: 208, a: 1 });
  const [borderGlow, setBorderGlow] = useState<Rgba>({ r: 10, g: 132, b: 208, a: 1 });
  const [handleRgba, setHandleRgba] = useState<Rgba>({ r: 61, g: 245, b: 245, a: 1 });
  const [handleGlow, setHandleGlow] = useState<Rgba>({ r: 61, g: 245, b: 245, a: 1 });
  const [abyssRgba, setAbyssRgba] = useState<Rgba>({ r: 62, g: 60, b: 52, a: 1 });
  const [root, setRoot] = useState<BaseNode>(new TileNode(onContext));
  const [, refreshRoot] = useReducer(x => x + 1, 0);
  const ref = useRef<HTMLDivElement>(null);
  const oldBorderPxRef = useRef<number>(-1);

  function randomizeColors() {
    const borderRgba = randomRgba();
    const handleRgba = randomRgba();
    setBorderRgba(borderRgba);
    setBorderGlow(borderRgba);
    setHandleRgba(handleRgba);
    setHandleGlow(handleRgba);
    window.electronAPI.setTitlebarBg(rgbaToHexa(borderRgba));
  }

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
    fn: () => randomizeColors()
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
    function handleMouseUp(e: MouseEvent) {
      if (e.button !== 0) return;
      window.electronAPI.send(ich.releaseHandles);
      window.electronAPI.send(ich.unhideAllViews);
    }
    function handleBlur() {
      window.electronAPI.send(ich.releaseHandles);
      window.electronAPI.send(ich.unhideAllViews);
    }
    registerListeners();
    window.electronAPI.send(ich.updateBorderPx, borderPx);
    window.electronAPI.send(ich.refreshAllViewBounds);
    //window.addEventListener("mouseout", releaseHandles);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("blur", handleBlur);
    const s = document.documentElement.style;
    s.setProperty("--border-glow", rgbaAsCss(borderGlow));
    s.setProperty("--handle-glow", rgbaAsCss(handleGlow));
    s.setProperty("--abyss-color", rgbaAsCss(abyssRgba));
    return () => {
      //window.removeEventListener("mouseout", releaseHandles);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("blur", handleBlur);
      unregisterListeners();
    };
  }, [abyssRgba, borderGlow, borderPx, handleGlow]);

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
    <Context.HandleRgba.Provider value={handleRgba}>
      <Context.BorderPx.Provider value={borderPx}>
        <div
          className="w-full h-full flex abyss"
        >
          <div
            className="flex w-full h-full border-glow"
            style={{
              borderColor: rgbaAsCss(borderRgba),
              borderLeftWidth: borderPx,
              borderRightWidth: borderPx,
              borderBottomWidth: borderPx,
            }}
            ref={ref}
          >
            {root.toElement()}
          </div>
        </div>
      </Context.BorderPx.Provider>
    </Context.HandleRgba.Provider>
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
  const borderPx = useContext(Context.BorderPx);
  const ref = useRef<HTMLDivElement>(null);

  function releaseHandles() {
    setCurrentHandle(null);
  }

  const releaseListener = useRef<IpcListener>({
    uuid: uuidv4(),
    fn: () => releaseHandles()
  });

  for (const child of children) {
    if (child instanceof TileNode) {
      child.contextBehavior = onContext;
    }
  }

  useEffect(() => {
    const listener1 = releaseListener.current;

    containers.set(nodeId, thisNode);
    function onMouseMove(e: MouseEvent) {
      if (currentHandle !== null && ref.current !== null) {
        const mousePos = e.clientX - ref.current.getBoundingClientRect().left;
        const newPercents = [...handlePercents];
        newPercents[currentHandle] = mousePos / ref.current.offsetWidth;
        thisNode.handlePercents = newPercents;
        refreshRoot();
      }
    }

    registerIpcListener(ich.releaseHandlesCC, listener1);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      containers.delete(nodeId);
      unregisterIpcListener(ich.releaseHandlesCC, listener1);
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
      nodeId,
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
        borderPx,
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
  nodeId,
  thisNode
}: ColumnProps): ReactElement {
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const borderPx = useContext(Context.BorderPx);
  const ref = useRef<HTMLDivElement>(null);

  function releaseHandles() {
    setCurrentHandle(null);
  }

  const releaseListener = useRef<IpcListener>({
    uuid: uuidv4(),
    fn: () => releaseHandles()
  });

  for (const child of children) {
    if (child instanceof TileNode) {
      child.contextBehavior = onContext;
    }
  }

  useEffect(() => {
    const listener1 = releaseListener.current;

    containers.set(nodeId, thisNode);

    function onMouseMove(e: MouseEvent) {
      if (currentHandle !== null && ref.current) {
        const mousePos = e.clientY - ref.current.getBoundingClientRect().top;
        const newPercents = [...handlePercents];
        newPercents[currentHandle] = mousePos / ref.current.offsetHeight;
        thisNode.handlePercents = newPercents;
        refreshRoot();
      }
    }

    registerIpcListener(ich.releaseHandlesCC, listener1);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      containers.delete(nodeId);
      unregisterIpcListener(ich.releaseHandlesCC, listener1);
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
      nodeId,
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
        borderPx,
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
  thisNode
}: TileProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const rectangle = useRef<Electron.Rectangle>({
    height: 100,
    width: 100,
    x: 0,
    y: 0
  });
  const [bg, setBg] = useState<string | null>(thisNode.bg);

  if (!colors.has(nodeId)) colors.set(nodeId, randomRgba({ brightness: 0.5, saturation: 0.3 }));
  const color = colors.get(nodeId);
  thisNode.ref = ref;
  thisNode.bgLoader.setter = setBg;

  useEffect(() => {
    tiles.set(nodeId, thisNode);

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
  });

  function element(): ReactElement {
    let divClass = "flex w-full h-full";
    if (!thisNode.parent) {
      divClass += " basis-full";
      delete style?.flexBasis;
    }

    function withImg(): ReactElement {
      return (
        <div
          key={uuidv4()}
          className={divClass}
          style={{
            ...style,
            zIndex: -50,
            pointerEvents: "all",
            backgroundRepeat: "round",
            backgroundImage: `url(${bg})`,
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
    function withoutImg(): ReactElement {
      return (
        <div
          key={uuidv4()}
          id={nodeId}
          ref={ref}
          className={divClass}
          style={{
            ...style,
            pointerEvents: "all",
            zIndex: -50,
            backgroundColor: rgbaAsCss(color!)
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

    switch (thisNode.bg !== null) {
    case true: return withImg();
    default: return withoutImg();
    }
  }
  return element();
}

function RowHandle({ onMouseDown, onMouseUp }: RowHandleProps): ReactElement {
  const borderPx = useContext<number>(Context.BorderPx);
  const handleRgba = useContext<Rgba>(Context.HandleRgba);

  return (
    <div
      className="handle-glow"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{
        pointerEvents: "all",
        width: `${borderPx}px`,
        backgroundColor: rgbaAsCss(handleRgba),
      }}
    />
  );
}

function ColumnHandle({ onMouseDown, onMouseUp }: ColumnHandleProps): ReactElement {
  const borderPx = useContext<number>(Context.BorderPx);
  const handleRgba = useContext<Rgba>(Context.HandleRgba);

  return (
    <div
      className="handle-glow"
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={{
        pointerEvents: "all",
        height: `${borderPx}px`,
        backgroundColor: rgbaAsCss(handleRgba),
      }}
    />
  );
}
