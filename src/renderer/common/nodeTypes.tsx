import { CSSProperties, ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import * as ich from "../../common/ipcChannels";
import { ContextOption, Direction } from "../../common/enums";
import { ColumnProps, ContextParams, RowProps, TileProps } from "../../common/interfaces";
import * as pre from "../../common/logPrefixes";
import * as log from "./loggerUtil";
import { Column, Row, Tile } from "../src/apps/Tiles";
import { BgLoader } from "./types";

export const tiles = new Map<string, TileNode>();
export const containers = new Map<string, ContainerNode>();
const fileName: string = "nodes.tsx";

export class TileTree {
  root: BaseNode;

  constructor(root: BaseNode) {
    this.root = root;
    if (root instanceof TileNode && root.nodeId) {
      tiles.set(root.nodeId, root);
    }
  }
}

export abstract class BaseNode {
  parent: BaseNode | null = null;
  abstract toElement(): ReactElement;
  abstract appendStyle(style: React.CSSProperties): void;
  abstract get style(): React.CSSProperties | undefined;
  abstract set style(value: React.CSSProperties);
  abstract get nodeId(): string;
  abstract set nodeId(value: string);
}

export abstract class ContainerNode extends BaseNode {
  abstract get children(): BaseNode[];
  abstract set children(value: BaseNode[]);
  abstract get refreshRoot(): React.DispatchWithoutAction;
  abstract set refreshRoot(value: React.DispatchWithoutAction);
  abstract get setRoot(): React.Dispatch<React.SetStateAction<BaseNode>>;
  abstract set setRoot(value: React.Dispatch<React.SetStateAction<BaseNode>>);
  abstract get rootContextBehavior(): (id: string, params: ContextParams) => void;
  abstract set rootContextBehavior(value: (id: string, params: ContextParams) => void);
  abstract get handlePercents(): number[];
  abstract set handlePercents(value: number[]);
}

export class TileNode extends BaseNode {
  ref: React.RefObject<HTMLDivElement> | null = null;
  bgLoader: BgLoader = new BgLoader();
  private _className?: string;
  private _style?: React.CSSProperties;
  private _id: string;
  private _url?: URL;
  private _contextBehavior: (id: string, params: ContextParams) => void ;
  private _resizeBehavior: (id: string, rectangle: Electron.Rectangle) => void;

  constructor({
    className: className,
    style: style,
    nodeId: id,
    url: url,
    contextBehavior: contextBehavior,
    resizeBehavior: resizeBehavior
  }: TileProps = {
    nodeId: uuidv4(),
    contextBehavior: () => {
      // #region logging
      log.info({
        ts: fileName, fn: `${TileNode.name}.constructor`
      }, `${pre.missing}: contextBehavior param`);
      // #endregion
    },
    resizeBehavior: () => {
      // #region logging
      log.info({
        ts: fileName, fn: `${TileNode.name}.constructor`
      }, `${pre.missing}: resizeBehavior param`);
      // #endregion
    }
  }) {
    super();
    this._className = className;
    this._style = style;
    this._id = id === undefined ? uuidv4() : id;
    this._url = url;
    this._contextBehavior = contextBehavior;
    this._resizeBehavior = resizeBehavior;
  }

  toElement(): ReactElement {
    return (
      <Tile
        className={this.className}
        style={this.style}
        nodeId={this.nodeId}
        url={this.url}
        contextBehavior={this._contextBehavior}
        resizeBehavior={this._resizeBehavior}
      >
      </Tile>
    );
  }

  get className(): string | undefined { return this._className; }
  set className(value: string) { this._className = value; }
  get style(): React.CSSProperties | undefined { return this._style; }
  set style(value: React.CSSProperties) { this._style = value; }
  get nodeId(): string { return this._id; }
  set nodeId(value: string) { this._id = value; }
  get url(): URL | undefined { return this._url; }
  set url(value: URL) {
    const logOptions = { ts: fileName, fn: `${TileNode.name}.url(set)` };
    this._url = value;
    // #region logging
    log.info(logOptions, `${pre.sendingEvent}: ${ich.setViewUrl} for id "${this.nodeId}"`);
    window.electronAPI.send(ich.setViewUrl, this.nodeId, value.toString());
    // #endregion
  }
  set contextBehavior(value: (id: string, params: ContextParams) => void) { this._contextBehavior = value; }
  set resizeBehavior(value: (id: string, rectangle: Electron.Rectangle) => void) { this._resizeBehavior = value; }
  getRect(): Electron.Rectangle | null {
    if (this.ref === null) {
      return null;
    }
    const element = this.ref.current as HTMLDivElement;
    return {
      height: element.offsetHeight,
      width: element.offsetWidth,
      x: element.offsetLeft,
      y: element.offsetTop
    };
  }
  appendStyle(style: React.CSSProperties) {
    this.style = { ...this.style, ...style };
  }
  split(id: string, direction: Direction) {
    this._contextBehavior(id, { option: ContextOption.Split, direction: direction });
  }
  resize(id: string, rectangle: Electron.Rectangle) {
    this._resizeBehavior(id, rectangle);
  }
}

export class ColumnNode extends ContainerNode {
  private _children: BaseNode[];
  private _refreshRoot: React.DispatchWithoutAction;
  private _setRoot: React.Dispatch<React.SetStateAction<BaseNode>>;
  private _rootContextBehavior: (id: string, params: ContextParams) => void;
  private _id: string;
  private _handlePercents: number[];
  private _style?: React.CSSProperties;

  constructor({
    children: children,
    refreshRoot: forceState,
    setRoot: setRoot,
    rootContextBehavior: rootContextBehavior,
    nodeId: id = uuidv4(),
    handlePercents: handlePercents,
    style: style
  }: ColumnProps) {
    super();
    for (const child of children) {
      child.parent = this;
    }
    this._children = children;
    this._refreshRoot = forceState;
    this._setRoot = setRoot;
    this._handlePercents = handlePercents;
    this._rootContextBehavior = rootContextBehavior;
    this._style = style;
    this._id = id;
  }

  toElement(): ReactElement {
    return <Column
      children={this.children}
      refreshRoot={this.refreshRoot}
      setRoot={this.setRoot}
      rootContextBehavior={this.rootContextBehavior}
      handlePercents={this.handlePercents}
      style={this.style}
      nodeId={this.nodeId}
    ></Column>;
  }

  get children(): BaseNode[] { return this._children; }
  set children(value: BaseNode[]) { this._children = value; }
  get refreshRoot(): React.DispatchWithoutAction { return this._refreshRoot; }
  set refreshRoot(value: React.DispatchWithoutAction) { this._refreshRoot = value; }
  get setRoot(): React.Dispatch<React.SetStateAction<BaseNode>> { return this._setRoot; }
  set setRoot(value: React.Dispatch<React.SetStateAction<BaseNode>>) { this._setRoot = value; }
  get rootContextBehavior(): (id: string, params: ContextParams) => void { return this._rootContextBehavior; }
  set rootContextBehavior(value: (id: string, params: ContextParams) => void) { this._rootContextBehavior = value; }
  get handlePercents(): number[] { return this._handlePercents; }
  set handlePercents(value: number[]) { this._handlePercents = value; }
  get style(): React.CSSProperties | undefined { return this._style; }
  set style(value: React.CSSProperties) { this._style = value; }
  get nodeId(): string { return this._id; }
  set nodeId(value: string) { this._id = value; }
  appendStyle(style: CSSProperties): void { this.style = { ...this.style, ...style }; }
}

export class RowNode extends ContainerNode {
  private _children: BaseNode[];
  private _refreshRoot: React.DispatchWithoutAction;
  private _setRoot: React.Dispatch<React.SetStateAction<BaseNode>>;
  private _rootContextBehavior: (id: string, params: ContextParams) => void;
  private _id: string;
  private _handlePercents: number[];
  private _style?: React.CSSProperties;

  constructor({
    children: children,
    refreshRoot: forceState,
    setRoot: setRoot,
    rootContextBehavior: rootContextBehavior,
    nodeId: id = uuidv4(),
    handlePercents: handlePercents,
    style: style
  }: RowProps) {
    super();
    for (const child of children) {
      child.parent = this;
    }
    this._children = children;
    this._refreshRoot = forceState;
    this._setRoot = setRoot;
    this._rootContextBehavior = rootContextBehavior;
    this._handlePercents = handlePercents;
    this._style = style;
    this._id = id;
  }

  toElement(): ReactElement {
    return <Row
      children={this.children}
      refreshRoot={this.refreshRoot}
      setRoot={this.setRoot}
      rootContextBehavior={this.rootContextBehavior}
      handlePercents={this.handlePercents}
      style={this.style}
      nodeId={this.nodeId}
    ></Row>;
  }

  get children(): BaseNode[] { return this._children; }
  set children(value: BaseNode[]) { this._children = value; }
  get refreshRoot(): React.DispatchWithoutAction { return this._refreshRoot; }
  set refreshRoot(value: React.DispatchWithoutAction) { this._refreshRoot = value; }
  get setRoot(): React.Dispatch<React.SetStateAction<BaseNode>> { return this._setRoot; }
  set setRoot(value: React.Dispatch<React.SetStateAction<BaseNode>>) { this._setRoot = value; }
  get rootContextBehavior(): (id: string, params: ContextParams) => void { return this._rootContextBehavior; }
  set rootContextBehavior(value: (id: string, params: ContextParams) => void) { this._rootContextBehavior = value; }
  get handlePercents(): number[] { return this._handlePercents; }
  set handlePercents(value: number[]) { this._handlePercents = value; }
  get style(): React.CSSProperties | undefined { return this._style; }
  set style(value: React.CSSProperties) { this._style = value; }
  get nodeId(): string { return this._id; }
  set nodeId(value: string) { this._id = value; }
  appendStyle(style: CSSProperties): void { this.style = { ...this.style, ...style }; }
}

export function recordTile(tileProps?: TileProps): TileNode {
  let tileNode: TileNode;
  if (tileProps !== undefined) {
    tileNode = new TileNode(tileProps);
  }
  else {
    tileNode = new TileNode();
  }
  tiles.set(tileNode.nodeId, tileNode);
  return tileNode;
}

export function recordRow(rowProps: RowProps): RowNode {
  const rowNode: RowNode = new RowNode(rowProps);
  containers.set(rowNode.nodeId, rowNode);
  return rowNode;
}

export function recordColumn(columnProps: ColumnProps): ColumnNode {
  const columnNode: ColumnNode = new ColumnNode(columnProps);
  containers.set(columnNode.nodeId, columnNode);
  return columnNode;
}