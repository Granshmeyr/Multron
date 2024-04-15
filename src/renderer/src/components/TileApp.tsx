import { ReactElement, useEffect, useReducer, useRef, useState } from "react";
import * as ch from "../../../common/channels.ts";
import { ContextOption, Direction } from "../../../common/enums";
import { ColumnHandleProps, ColumnProps, ContextParams, RowHandleProps, RowProps, TileProps, Vector2 } from "../../../common/interfaces.ts";
import * as pre from "../../../common/logPrefixes.ts";
import { buildTree, deleteTile as deletion, setUrl } from "../../common/containerShared.tsx";
import * as log from "../../common/loggerUtil.ts";
import { BaseNode, ColumnNode, RowNode, TileNode, TileTree, containers, recordColumn, recordRow, recordTile, tiles } from "../../common/nodes.tsx";
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
  const [, refreshRoot] = useReducer(x => x + 1, 0);

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
          refreshRoot: refreshRoot
        }));
      }
      function down() {
        setRoot(recordColumn({
          children: [tile, recordTile()],
          handlePercents: [splitPercentY()],
          refreshRoot: refreshRoot
        }));
      }
      function left() {
        setRoot(recordRow({
          children: [recordTile(), tile],
          handlePercents: [splitPercentX()],
          refreshRoot: refreshRoot
        }));
      }
      function right() {
        setRoot(recordRow({
          children: [tile, recordTile()],
          handlePercents: [splitPercentX()],
          refreshRoot: refreshRoot
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
  { children, refreshRoot, handlePercents, style, id }: RowProps
): ReactElement {
  const logOptions = { ts: fileName, fn: Row.name };
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
        containers[id as string].handlePercents = newPercents;
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

  function onContext(tileId: string, params: ContextParams) {
    function split() {
      const tile = tiles[tileId];
      const parent = tile.parent as RowNode;
      const tileRef = tiles[tileId].ref as React.RefObject<HTMLDivElement>;
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
          refreshRoot: refreshRoot
        });
        column.parent = containers[id as string];
        parent.children[tileIndex] = column;
      }
      function down() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        const column = recordColumn({
          children: [tile, splitTile],
          handlePercents: [splitPercentY()],
          refreshRoot: refreshRoot
        });
        column.parent = containers[id as string];
        parent.children[tileIndex] = column;
      }
      function left() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        newPercents.splice(tileIndex, 0, splitPercentX());
        containers[id as string].handlePercents = newPercents;
      }
      function right() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        newPercents.splice(tileIndex, 0, splitPercentX());
        containers[id as string].handlePercents = newPercents;
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
    case ContextOption.Delete: deletion(id as string, tileId, refreshRoot); break;
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
      { buildTree(children, handlePercents, setCurrentHandle, RowHandle) }
    </div>
  );
}

export function Column(
  { children, refreshRoot, handlePercents, style, id }: ColumnProps
): ReactElement {
  const logOptions = { ts: fileName, fn: Column.name };
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
        containers[id as string].handlePercents = newPercents;
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

  function onContext(tileId: string, params: ContextParams) {
    const tile = tiles[tileId];
    function split() {
      const parent = tile.parent as ColumnNode;
      const tileRef = tiles[tileId].ref as React.RefObject<HTMLDivElement>;
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
        containers[id as string].handlePercents = newPercents;
      }
      function down() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        parent.children.splice(tileIndex + 1, 0, splitTile);
        splitTile.parent = parent;
        const newPercents = [...handlePercents];
        newPercents.splice(tileIndex, 0, splitPercentY());
        containers[id as string].handlePercents = newPercents;
      }
      function left() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        const row = recordRow({
          children: [splitTile, tile],
          handlePercents: [splitPercentX()],
          refreshRoot: refreshRoot
        });
        row.parent = containers[id as string];
        parent.children[tileIndex] = row;
      }
      function right() {
        const tileIndex = parent.children.indexOf(tile);
        const splitTile = recordTile();
        const row = recordRow({
          children: [tile, splitTile],
          handlePercents: [splitPercentX()],
          refreshRoot: refreshRoot
        });
        row.parent = containers[id as string];
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
    case ContextOption.Delete: deletion(id as string, tileId, refreshRoot); break;
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
  const rectangle = useRef<Electron.Rectangle>({
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
    const _logOptions = { ts: fileName, fn: `${Tile.name}/${useEffect.name}` };
    tiles[id as string].ref = ref;
    async function createViewOrResizeAsync() {
      log.info(_logOptions, `${pre.invokingEvent}: ${ch.doesViewExist} for id "${id}"`);
      if (!await window.electronAPI.invoke(ch.doesViewExist, id) as boolean) {
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
  }, [id, resizeBehavior]);

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
