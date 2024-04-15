import { CSSProperties, ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import * as ch from "../../common/channels";
import { ContextOption, Direction } from "../../common/enums";
import { ColumnProps, ContextParams, RowProps, TileProps } from "../../common/interfaces";
import { Column, Row, Tile } from "../src/components/TileApp";
import * as log from "../common/loggerUtil";
import * as pre from "../../common/logPrefixes";

export const tiles: Record<string, TileNode> = {};
export const containers: Record<string, ContainerNode> = {};
const fileName: string = "nodes.tsx";

export class TileTree {
  root: BaseNode;

  constructor(root: BaseNode) {
    this.root = root;
    if (root instanceof TileNode && root.id) {
      tiles[root.id] = root;
    }
  }
}

export abstract class BaseNode {
  parent: BaseNode | null = null;
  abstract toElement(): ReactElement;
  abstract appendStyle(style: React.CSSProperties): void;
  abstract get style(): React.CSSProperties | undefined;
  abstract set style(value: React.CSSProperties);
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
  abstract get id(): string;
  abstract set id(value: string);
}

export class TileNode extends BaseNode {
  ref: React.RefObject<HTMLDivElement> | null = null;
  private _className?: string;
  private _style?: React.CSSProperties;
  private _id: string;
  private _url?: URL;
  private _contextBehavior: (id: string, params: ContextParams) => void;
  private _resizeBehavior: (id: string, rectangle: Electron.Rectangle) => void;

  constructor(
    {
      className: className,
      style: style,
      id: id = uuidv4(),
      url: url,
      contextBehavior: splitBehavior,
      resizeBehavior: resizeBehavior
    }: TileProps = {
      id: uuidv4(),
      contextBehavior: () => {
        log.info({
          ts: fileName, fn: `${TileNode.name}.constructor`
        }, `${pre.missing}: contextBehavior param`); },
      resizeBehavior: () => { log.info({
        ts: fileName, fn: `${TileNode.name}.constructor`
      }, `${pre.missing}: resizeBehavior param`); }
    },
    parent: ColumnNode | RowNode | null = null
  ) {
    super();
    this.parent = parent;
    this._className = className;
    this._style = style;
    this._id = id;
    this._url = url;
    this._contextBehavior = splitBehavior;
    this._resizeBehavior = resizeBehavior;
  }

  toElement(): ReactElement {
    return <Tile
      className={this.className}
      style={this.style}
      id={this.id}
      url={this.url}
      contextBehavior={this._contextBehavior}
      resizeBehavior={this._resizeBehavior}>
    </Tile>;
  }

  get className(): string | undefined { return this._className; }
  set className(value: string) { this._className = value; }
  get style(): React.CSSProperties | undefined { return this._style; }
  set style(value: React.CSSProperties) { this._style = value; }
  get id(): string { return this._id; }
  set id(value: string) { this._id = value; }
  get url(): URL | undefined { return this._url; }
  set url(value: URL) {
    const logOptions = { ts: fileName, fn: `${TileNode.name}.url(set)` };
    this._url = value;
    log.info(logOptions, `${pre.sendingEvent}: ${ch.setViewUrl} for id "${this.id}"`);
    window.electronAPI.send(ch.setViewUrl, this.id, value.toString());
  }
  set contextBehavior(value: (id: string, params: ContextParams) => void) { this._contextBehavior = value; }
  set resizeBehavior(value: (id: string, rectangle: Electron.Rectangle) => void) { this._resizeBehavior = value; }
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
    id: id = uuidv4(),
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
      id={this.id}
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
  get id(): string { return this._id; }
  set id(value: string) { this._id = value; }
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
    id: id = uuidv4(),
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
      id={this.id}
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
  get id(): string { return this._id; }
  set id(value: string) { this._id = value; }
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
  tiles[tileNode.id] = tileNode;
  return tileNode;
}

export function recordRow(rowProps: RowProps): RowNode {
  const rowNode: RowNode = new RowNode(rowProps);
  containers[rowNode.id] = rowNode;
  return rowNode;
}

export function recordColumn(columnProps: ColumnProps): ColumnNode {
  const columnNode: ColumnNode = new ColumnNode(columnProps);
  containers[columnNode.id] = columnNode;
  return columnNode;
}