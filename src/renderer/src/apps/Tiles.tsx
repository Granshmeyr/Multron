import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import * as ch from "../../../common/channels.ts";
import { ContextOption, Direction } from "../../../common/enums.ts";
import { ColumnHandleProps, ColumnProps, ContextParams, RowHandleProps, RowProps, TileProps, Vector2, ViewData } from "../../../common/interfaces.ts";
import * as pre from "../../../common/logPrefixes.ts";
import { buildTree, deletion, setUrl } from "../../common/containerUtil.tsx";
import * as log from "../../common/loggerUtil.ts";
import { BaseNode, ColumnNode, ContainerNode, RowNode, TileNode, TileTree, containers, recordColumn, recordRow, recordTile, tiles } from "../../common/nodeTypes.tsx";
import { editMargin, fpsToMs, marginizeRectangle, onResize, randomColor, setEditMode, interpRectangleAsync, throttle, editShrinkMs } from "../../common/util.ts";

const colors = new Map<string, string>();
const fileName: string = "TileApp.tsx";
const resizeThrottleMs: number = fpsToMs(15);
let clickedPosition: Vector2;

export default function Main(): ReactElement {
  const logOptions = {
    ts: fileName,
    fn: Main.name
  };
  const ref = useRef<HTMLDivElement>(null);
  const throttledResize = useRef(throttle(function (id, rectangle) {
    onResize(id as string, rectangle as Electron.Rectangle);
  }, resizeThrottleMs));
  const [tileTree] = useState<TileTree>(
    new TileTree(
      recordTile({
        contextBehavior: onContext,
        resizeBehavior: throttledResize.current
      })
    )
  );
  const [root, setRoot] = useState<BaseNode>(tileTree.root);
  const [, refreshRoot] = useReducer(x => x + 1, 0);

  if (!window.electronAPI.isListening(ch.toggleEditMode)) {
    log.info(logOptions, `${pre.listeningOn}: ${ch.toggleEditMode}`);
    window.electronAPI.on(ch.toggleEditMode, async function (_, ...args: unknown[]) {
      log.info(logOptions, `${pre.eventReceived}: ${ch.toggleEditMode}`);
      const enabled = args[0] as boolean;
      const viewData = await window.electronAPI.invoke(ch.getViewData) as Map<string, ViewData>;
      setEditMode(enabled);
      function enterEditMode() {
        for (const [id, data] of viewData) {
          const initialRect = data.rectangle;
          log.info(logOptions, `${pre.running}: ${interpRectangleAsync.name} from non-margin to marginized rect`);
          interpRectangleAsync(
            id,
            initialRect,
            marginizeRectangle(initialRect, editMargin),
            editShrinkMs
          );
        }
      }
      function exitEditMode() {
        for (const [id, data] of viewData) {
          const initialRect = data.rectangle;
          log.info(logOptions, `${pre.running}: ${interpRectangleAsync.name} from marginized to non-margin rect`);
          interpRectangleAsync(
            id,
            initialRect,
            marginizeRectangle(initialRect, -editMargin),
            editShrinkMs
          );
        }
      }
      switch (enabled) {
      case true: enterEditMode(); break;
      default: exitEditMode(); break;
      }
    });
  }
  if (!window.electronAPI.isListening(ch.mainProcessContextMenu)) {
    log.info(logOptions, `${pre.listeningOn}: ${ch.mainProcessContextMenu}`);
    window.electronAPI.on(ch.mainProcessContextMenu, function (_, ...args: unknown[]) {
      log.info(logOptions, `${pre.eventReceived}: ${ch.mainProcessContextMenu}`);
      const tileId: string = args[0] as string;
      const params = args[1] as ContextParams | null;
      const position: Vector2 = args[2] as Vector2;
      if (params === null) {
        return;
      }
      clickedPosition = position;
      function split() {
        if (tiles.get(tileId)!.ref === null) {
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
          return;
        }
        tiles.get(tileId)!.split(tileId, params!.direction as Direction);
      }
      switch (params.option) {
      case ContextOption.Split: split(); break;
      case ContextOption.Delete: (
        function () {
          const parent = tiles.get(tileId)!.parent as ContainerNode | null;
          if (parent === null) { return; }
          deletion(
            parent.id,
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

  useEffect(function () {
    function onContextMenu(e: MouseEvent) {
      clickedPosition = { x: e.clientX, y: e.clientY };
    }

    document.addEventListener("contextmenu", onContextMenu);
    return function () {
      document.removeEventListener("contextmenu", onContextMenu);
    };
  });

  function onContext(tileId: string, params: ContextParams) {
    const tile = tiles.get(tileId) as TileNode;
    function split() {
      function splitPercentY(): number {
        if (!ref.current) {
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
          return 0.1;
        }
        const divHeight = ref.current.offsetHeight;
        const mousePosition = clickedPosition.y - ref.current.getBoundingClientRect().top;
        return mousePosition / divHeight;
      }
      function splitPercentX(): number {
        if (!ref.current) {
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref is null`);
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
  { children, refreshRoot, setRoot, rootContextBehavior, handlePercents, style, id }: RowProps
): ReactElement {
  const logOptions = { ts: fileName, fn: Row.name };
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const resizeCache = useRef(new Map<TileNode, (...args: unknown[]) => unknown>());

  for (const child of children) {
    if (child instanceof TileNode) {
      child.contextBehavior = onContext;
      if (!(resizeCache.current.has(child))) {
        const throttledResize = throttle(function (id, rectangle) {
          onResize(id as string, rectangle as Electron.Rectangle);
        }, resizeThrottleMs);
        resizeCache.current.set(child, throttledResize);
      }
      child.resizeBehavior = resizeCache.current.get(child)!;
    }
  }

  useEffect(function () {
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
        containers.get(id as string)!.handlePercents = newPercents;
        refreshRoot();
      }
    }
    function onContextMenu(e: MouseEvent) {
      clickedPosition = { x: e.clientX, y: e.clientY };
    }

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return function () {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  });

  function onContext(tileId: string, params: ContextParams) {
    function split() {
      const tile = tiles.get(tileId) as TileNode;
      const parent = tile.parent as RowNode;
      const tileRef = tiles.get(tileId)!.ref as React.RefObject<HTMLDivElement>;
      function splitPercentY(): number {
        if (tileRef.current === null) {
          log.error(logOptions, `${pre.invalidValue}: TileNode.ref.current is null`);
          return 0.1;
        }
        const divHeight = tileRef.current.offsetHeight;
        const mousePosition = clickedPosition.y - tileRef.current.getBoundingClientRect().top;
        return mousePosition / divHeight;
      }
      function splitPercentX(): number {
        if (ref.current === null) {
          log.error(logOptions, `${pre.invalidValue}: Row ref is null`);
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
        column.parent = containers.get(id as string)!;
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
        column.parent = containers.get(id as string)!;
        parent.children[tileIndex] = column;
      }
      function left() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        newPercents.splice(tileIndex, 0, splitPercentX());
        containers.get(id as string)!.handlePercents = newPercents;
      }
      function right() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        newPercents.splice(tileIndex, 0, splitPercentX());
        containers.get(id as string)!.handlePercents = newPercents;
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
        id as string,
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
      id={id}
    >
      {buildTree(children, handlePercents, setCurrentHandle, RowHandle)}
    </div>
  );
}

export function Column(
  { children, refreshRoot, setRoot, rootContextBehavior, handlePercents, style, id }: ColumnProps
): ReactElement {
  const logOptions = { ts: fileName, fn: Column.name };
  const [currentHandle, setCurrentHandle] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const resizeCache = useRef(new Map<TileNode, (...args: unknown[]) => unknown>());

  for (const child of children) {
    if (child instanceof TileNode) {
      child.contextBehavior = onContext;
      if (!(resizeCache.current.has(child))) {
        const throttledResize = throttle(function (id, rectangle) {
          onResize(id as string, rectangle as Electron.Rectangle);
        }, resizeThrottleMs);
        resizeCache.current.set(child, throttledResize);
      }
      child.resizeBehavior = resizeCache.current.get(child)!;
    }
  }

  useEffect(function () {
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
        containers.get(id as string)!.handlePercents = newPercents;
        refreshRoot();
      }
    }
    function onContextMenu(e: MouseEvent) {
      clickedPosition = { x: e.clientX, y: e.clientY };
    }
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("mousemove", onMouseMove);
    return function () {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("mousemove", onMouseMove);
    };
  });

  function onContext(tileId: string, params: ContextParams) {
    const tile = tiles.get(tileId) as TileNode;
    function split() {
      const parent = tile.parent as ColumnNode;
      const tileRef = tiles.get(tileId)!.ref as React.RefObject<HTMLDivElement>;
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
        const newPercents = [...handlePercents];
        newPercents.splice(tileIndex, 0, splitPercentY());
        containers.get(id as string)!.handlePercents = newPercents;
      }
      function down() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        newPercents.splice(tileIndex, 0, splitPercentY());
        containers.get(id as string)!.handlePercents = newPercents;
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
        row.parent = containers.get(id as string)!;
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
        row.parent = containers.get(id as string)!;
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
        id as string,
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
      id={id}
    >
      {buildTree(children, handlePercents, setCurrentHandle, ColumnHandle)}
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
  const rectangle = useRef<Electron.Rectangle>({
    height: 100,
    width: 100,
    x: 0,
    y: 0
  });

  if (!(colors.has(id as string))) {
    colors.set(id as string, randomColor());
  }
  const color = colors.get(id as string);

  useEffect(function () {
    const _logOptions = { ts: fileName, fn: `${Tile.name}/${useEffect.name}` };
    tiles.get(id as string)!.ref = ref;
    async function createViewOrResizeAsync() {
      log.info(_logOptions, `${pre.invokingEvent}: ${ch.getViewData} for id "${id}"`);
      const viewData = await window.electronAPI.invoke(ch.getViewData) as Map<string, ViewData>;
      if (!(viewData.has(id as string))) {
        log.info(_logOptions, `${pre.invokingEvent}: ${ch.createViewAsync} for id "${id}"`);
        await window.electronAPI.invoke(ch.createViewAsync, id, {
          webPreferences: {
            disableHtmlFullscreenWindowResize: true,
            enablePreferredSizeMode: true
          }
        });
        resizeBehavior(id as string, rectangle.current);
      }
      else {
        resizeBehavior(id as string, rectangle.current);
      }
    }
    const resizeObserver = new ResizeObserver(async function () {
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
    return function () {
      resizeObserver.disconnect();
    };
  }, [id, resizeBehavior]);

  function toElement(): ReactElement {
    const imgUrl: string | null = tiles.get(id as string)!.imgUrl;
    function withImg() {
      return (
        <div
          className={(function () {
            if (className !== undefined) {
              return defaultClass + " " + className;
            }
            return defaultClass;
          })()}
          style={{ ...style, backgroundColor: color }}
          id={id}
          ref={ref}
          onContextMenu={
            async function () {
              log.info(logOptions, `${pre.invokingEvent}: ${ch.showContextMenuAsync}`);
              const params = await window.electronAPI.invoke(ch.showContextMenuAsync) as ContextParams | null;
              if (params === null) {
                log.info(logOptions, `${pre.userInteraction}: selected Nothing (null)`);
                return;
              }
              const option: string = (function () {
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
          <img src={tiles.get(id as string)!.imgUrl as string}></img>
        </div>
      );
    }
    function noImg() {
      return (
        <div
          className={(function () {
            if (className !== undefined) {
              return defaultClass + " " + className;
            }
            return defaultClass;
          })()}
          style={{ ...style, backgroundColor: color }}
          id={id}
          ref={ref}
          onContextMenu={
            async function () {
              log.info(logOptions, `${pre.invokingEvent}: ${ch.showContextMenuAsync}`);
              const params = await window.electronAPI.invoke(ch.showContextMenuAsync) as ContextParams | null;
              if (params === null) {
                log.info(logOptions, `${pre.userInteraction}: selected Nothing (null)`);
                return;
              }
              const option: string = (function () {
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
    switch (imgUrl !== null) {
    case true: return withImg();
    default: return noImg();
    }
  }
  return toElement();
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
