import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import { ContextOption, Direction } from "../../../common/enums.ts";
import { ColumnHandleProps, ColumnProps, ContextParams, Listener, RowHandleProps, RowProps, TileProps, Vector2, ViewData } from "../../../common/interfaces.ts";
import * as ich from "../../../common/ipcChannels.ts";
import * as pre from "../../../common/logPrefixes.ts";
import { buildTree, deletion, setUrl } from "../../common/containerUtil.tsx";
import * as log from "../../common/loggerUtil.ts";
import { BaseNode, ColumnNode, ContainerNode, RowNode, TileNode, TileTree, containers, recordColumn, recordRow, recordTile, tiles } from "../../common/nodeTypes.jsx";
import { resizeTicker } from "../../common/types.ts";
import { registerIpcListener, setEditMode } from "../../common/util.ts";
import Greeting from "./app-components/TilesGreeting.tsx";
import { v4 as uuidv4 } from "uuid";
import { IpcRendererEvent } from "electron";

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

  // #region listeners
  const listener1 = useRef<Listener>({
    channel: ich.toggleEditMode,
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
    uuid: uuidv4()
  });
  const listener2 = useRef<Listener>({
    channel: ich.mainProcessContextMenu,
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
    uuid: uuidv4()
  });
  const listener3 = useRef<Listener>({
    channel: "debug",
    fn: () => {
    },
    uuid: uuidv4()
  });
  const listener4 = useRef<Listener>({
    channel: ich.callTileContextBehaviorCC,
    fn: (_, ...args: unknown[]) => {
      const tile = tiles.get(args[0] as string)!;
      const params = args[1] as ContextParams;
      const pos = args[2] as Vector2 | undefined;
      switch (params.option) {
      case ContextOption.Split: tile.split(pos!, params.direction!); break;
      case ContextOption.Delete: tile.delete(); break;
      }
    },
    uuid: uuidv4()
  });
  [listener1, listener2, listener3, listener4].forEach(v => registerIpcListener(v.current));
  // #endregion

  if (resizeTicker.refreshRoot === null) {
    resizeTicker.refreshRoot = refreshRoot;
  }

  function onContext(tileId: string, params: ContextParams, pos?: Vector2) {
    const tile = tiles.get(tileId) as TileNode;
    function split() {
      console.log("splitting from main!");
      console.log(tileId);
      console.log(params);
      console.log(`${pos?.x}, ${pos?.y}`);
      function splitPercentY(): number {
        if (!ref.current) {
          // #region logging
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
          // #endregion
          return 0.1;
        }
        const divHeight = ref.current.offsetHeight;
        const mousePosition = pos!.y - ref.current.getBoundingClientRect().top;
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
        const mousePosition = pos!.x - ref.current.getBoundingClientRect().left;
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
        const column = recordColumn({
          children: [splitTile, tile],
          handlePercents: [ContainerNode.splitPercentY(
            tileRef.current,
            pos!
          )],
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
          handlePercents: [ContainerNode.splitPercentY(
            tileRef.current,
            pos!
          )],
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
        newPercents.splice(
          tileIndex,
          0,
          ContainerNode.splitPercentX(ref.current, pos!)
        );
        containers.get(nodeId as string)!.handlePercents = newPercents;
      }
      function right() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        newPercents.splice(
          tileIndex,
          0,
          ContainerNode.splitPercentX(ref.current, pos!)
        );
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
        newPercents.splice(
          tileIndex,
          0,
          ContainerNode.splitPercentY(ref.current, pos!)
        );
        containers.get(nodeId as string)!.handlePercents = newPercents;
      }
      function down() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        newPercents.splice(
          tileIndex,
          0,
          ContainerNode.splitPercentY(ref.current, pos!)
        );
        containers.get(nodeId as string)!.handlePercents = newPercents;
      }
      function left() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        const row = recordRow({
          children: [splitTile, tile],
          handlePercents: [ContainerNode.splitPercentX(
            tileRef.current,
            pos!
          )],
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
          handlePercents: [ContainerNode.splitPercentX(
            tileRef.current,
            pos!
          )],
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
