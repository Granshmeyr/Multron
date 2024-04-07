import { CSSProperties, ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import { Column, Row, Tile } from "../renderer/src/components/TileApp";
import { Direction } from "./enums";
import { ColumnProps, RowProps, TileProps } from "./interfaces";

export const tiles: Record<string, TileNode> = {};

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
}

export abstract class ContainerNode extends BaseNode {
  abstract get children(): BaseNode[];
  abstract set children(value: BaseNode[]);
  abstract get forceState(): React.DispatchWithoutAction;
  abstract set forceState(value: React.DispatchWithoutAction);
  abstract get initialSplit(): number | undefined;
  abstract set initialSplit(value: number);
  abstract get style(): React.CSSProperties | undefined;
  abstract set style(value: React.CSSProperties);
  abstract appendStyle(style: React.CSSProperties): void;
}

export class TileNode extends BaseNode {
  ref: React.RefObject<HTMLDivElement> | null = null;
  private _props: TileProps;
  private _className?: string;
  private _style?: React.CSSProperties;
  private _id: string;
  private _url?: URL;
  private _splitBehavior: (id: string, direction: Direction) => void;
  private _resizeBehavior: (id: string, rectangle: Electron.Rectangle) => void;

  constructor(
    {
      className: className,
      style: style,
      id: id = uuidv4(),
      url: url,
      splitBehavior: splitBehavior,
      resizeBehavior: resizeBehavior
    }: TileProps = {
      id: uuidv4(),
      splitBehavior: () => { console.log("no splitbehavior"); },
      resizeBehavior: () => { console.log("no resizebehavior"); }
    },
    parent: ColumnNode | RowNode | null = null
  ) {
    super();
    this.parent = parent;
    this._props = {
      className: className,
      style: style,
      id: id,
      url: url,
      splitBehavior: splitBehavior,
      resizeBehavior: resizeBehavior,
    };
    this._className = className;
    this._style = style;
    this._id = id;
    this._url = url;
    this._splitBehavior = splitBehavior;
    this._resizeBehavior = resizeBehavior;
  }

  toElement(): ReactElement {
    return <Tile
      className={this.className}
      style={this.style}
      id={this.id}
      url={this.url}
      splitBehavior={this._splitBehavior}
      resizeBehavior={this._resizeBehavior}>
    </Tile>;
  }

  getProps(): TileProps { return this._props; }
  setProps(props: TileProps) { this._props = props; }
  appendProps(props: TileProps) { this._props = { ...this._props, ...props }; }

  get className(): string | undefined { return this._className; }
  set className(value: string) {
    this._className = value;
    this.setProps({ ...this._props, className: value });
  }
  get style(): React.CSSProperties | undefined { return this._style; }
  set style(value: React.CSSProperties) {
    this._style = value;
    this.setProps({ ...this._props, style: value });
  }
  appendStyle(style: React.CSSProperties) { this._style = { ...this._style, ...style }; }
  get id(): string { return this._id; }
  set id(value: string) {
    this._id = value;
    this.setProps({ ...this._props, id: value });
  }
  get url(): URL | undefined { return this._url; }
  set url(value: URL) {
    this._url = value;
    this.setProps({ ...this._props, url: value });
  }
  split(id: string, direction: Direction) { this._splitBehavior(id, direction); }
  setSplitBehavior(value: (id: string, direction: Direction) => void) {
    this._splitBehavior = value;
    this.setProps({ ...this._props, splitBehavior: value });
  }
  resize(id: string, rectangle: Electron.Rectangle) { return this._resizeBehavior(id, rectangle); }
  setResizeBehavior(value: (id: string, rectangle: Electron.Rectangle) => void) {
    this._resizeBehavior = value;
    this.setProps({ ...this._props, resizeBehavior: value });
  }
}

export class ColumnNode extends ContainerNode {
  private _props: ColumnProps;
  private _children: BaseNode[];
  private _forceState: React.DispatchWithoutAction;
  private _initialSplit?: number;
  private _style?: React.CSSProperties;

  constructor({
    children: children,
    forceState: forceState,
    initialSplit: initialSplit,
    style: style
  }: ColumnProps) {
    super();
    for (const child of children) {
      child.parent = this;
    }
    this._props = {
      children: children,
      forceState: forceState,
      initialSplit: initialSplit,
      style: style
    };
    this._children = children;
    this._forceState = forceState;
    this._initialSplit = initialSplit;
    this._style = style;
  }

  toElement(): ReactElement {
    return <Column
      children={this.children}
      forceState={this.forceState}
      initialSplit={this.initialSplit}
      style={this.style}
    ></Column>;
  }

  setProps(props: ColumnProps) { this._props = props; }

  get children(): BaseNode[] { return this._children; }
  set children(value: BaseNode[]) {
    this._children = value;
    this.setProps({ ...this._props, children: value });
  }
  get forceState(): React.DispatchWithoutAction { return this._forceState; }
  set forceState(value: React.DispatchWithoutAction) {
    this._forceState = value;
    this.setProps({ ...this._props, forceState: value });
  }
  get initialSplit(): number | undefined { return this._initialSplit; }
  set initialSplit(value: number) {
    this._initialSplit = value;
    this.setProps({ ...this._props, initialSplit: value });
  }
  get style(): React.CSSProperties | undefined { return this._style; }
  set style(value: React.CSSProperties) {
    this._style = value;
    this.setProps({ ...this._props, style: value });
  }
  appendStyle(style: CSSProperties): void { this._style = { ...this._style, ...style }; }
}

export class RowNode extends ContainerNode {
  private _props: RowProps;
  private _children: BaseNode[];
  private _forceState: React.DispatchWithoutAction;
  private _initialSplit?: number;
  private _style?: React.CSSProperties;

  constructor({
    children: children,
    forceState: forceState,
    initialSplit: initialSplit,
    style: style
  }: RowProps) {
    super();
    for (const child of children) {
      child.parent = this;
    }
    this._props = {
      children: children,
      forceState: forceState,
      initialSplit: initialSplit,
      style: style
    };
    this._children = children;
    this._forceState = forceState;
    this._initialSplit = initialSplit;
    this._style = style;
  }

  toElement(): ReactElement {
    return <Row
      children={this.children}
      forceState={this.forceState}
      initialSplit={this.initialSplit}
      style={this.style}
    ></Row>;
  }

  setProps(props: RowProps) { this._props = props; }

  get children(): BaseNode[] { return this._children; }
  set children(value: BaseNode[]) {
    this._children = value;
    this.setProps({ ...this._props, children: value });
  }
  get forceState(): React.DispatchWithoutAction { return this._forceState; }
  set forceState(value: React.DispatchWithoutAction) {
    this._forceState = value;
    this.setProps({ ...this._props, forceState: value });
  }
  get initialSplit(): number | undefined { return this._initialSplit; }
  set initialSplit(value: number) {
    this._initialSplit = value;
    this.setProps({ ...this._props, initialSplit: value });
  }
  get style(): React.CSSProperties | undefined { return this._style; }
  set style(value: React.CSSProperties) {
    this._style = value;
    this.setProps({ ...this._props, style: value });
  }
  appendStyle(style: CSSProperties): void { this._style = { ...this._style, ...style }; }
}

export function recordTile(tileProps?: TileProps): TileNode {
  let tileNode: TileNode;
  if (tileProps !== undefined) {
    tileNode = new TileNode(tileProps);
  }
  else {
    tileNode = new TileNode();
  }
  tiles[tileNode.id as unknown as number] = tileNode;
  return tileNode;
}
