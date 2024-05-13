import { ReactElement } from "react";
import { v4 as uuidv4 } from "uuid";
import { ContextOption, Direction } from "../../common/enums.ts";
import { ColumnProps, ContextBehavior, Neighbors, RowProps, TileProps, Vector2 } from "../../common/interfaces.ts";
import * as ich from "../../common/ipcChannels.ts";
import { Column, Row, Tile } from "../src/apps/Tiles.tsx";
import { BgLoader, ViewRectEnforcer } from "./types.ts";
import { fpsToMs } from "./util.ts";

export const tiles = new Map<string, TileNode>();
export const containers = new Map<string, ContainerNode>();
export const rectUpdateMs = fpsToMs(10);

type RowNodeProps = Omit<RowProps, "nodeId" | "style" | "thisNode">
type ColumnNodeProps = Omit<ColumnProps, "nodeId" | "style" | "thisNode">

export abstract class BaseNode {
  parent: ContainerNode | null = null;
  nodeId: string = uuidv4();
  style: React.CSSProperties = {};
  abstract toElement(): ReactElement;
}

export abstract class ContainerNode extends BaseNode {
  neighbors: Neighbors = { top: false, bottom: false, left: false, right: false };
  abstract get children(): BaseNode[];
  abstract set children(value: BaseNode[]);
  abstract get refreshRoot(): React.DispatchWithoutAction;
  abstract set refreshRoot(value: React.DispatchWithoutAction);
  abstract get setRoot(): React.Dispatch<React.SetStateAction<BaseNode>>;
  abstract set setRoot(value: React.Dispatch<React.SetStateAction<BaseNode>>);
  abstract get rootContextBehavior(): ContextBehavior;
  abstract set rootContextBehavior(value: ContextBehavior);
  abstract get handlePercents(): number[];
  abstract set handlePercents(value: number[]);
  rescanNeighbors() {
    if (this.parent === null) {
      this.neighbors = { top: false, bottom: false, left: false, right: false };
      return;
    }
    const n: Neighbors = { top: false, bottom: false, left: false, right: false };
    function recurse(node: BaseNode) {
      const p = node.parent;
      if (!p) return;
      const c = p.children;
      const i = c.indexOf(node);
      if (i !== 0 || i !== c.length) recurse(p);
      if (p instanceof ColumnNode) {
        const c = p.children;
        if (c[0] !== node)            n.top = true;
        if (c[c.length - 1] !== node) n.bottom = true;
      }
      else if (p instanceof RowNode) {
        const c = p.children;
        if (c[0] !== node)            n.left = true;
        if (c[c.length - 1] !== node) n.right = true;
      }
      if (Object.values(n).every(v => v === true)) return;
      recurse(p);
    }
    recurse(this);
    this.neighbors = n;
  }
}

export class TileNode extends BaseNode {
  bgLoader = new BgLoader();
  viewRectEnforcer = new ViewRectEnforcer(this, rectUpdateMs);
  ref: React.RefObject<HTMLDivElement> | null = null;
  private _url?: URL;
  private _contextBehavior: ContextBehavior;

  constructor(contextBehavior?: ContextBehavior) {
    super();
    this.nodeId = uuidv4();
    if (contextBehavior !== undefined) this._contextBehavior = contextBehavior;
    else this._contextBehavior = () => console.log("default contextBehavior");
  }

  toElement(): ReactElement {
    return (
      <Tile
        style={this.style}
        nodeId={this.nodeId}
        contextBehavior={this._contextBehavior}
        thisNode={this}
      >
      </Tile>
    );
  }
  setProps(props: TileProps) {
    if (props.style !== undefined) this.style = props.style;
    if (props.nodeId !== undefined) this.nodeId = props.nodeId;
    if (props.url !== undefined) this._url = props.url;
    if (props.contextBehavior !== undefined) this._contextBehavior = props.contextBehavior;
  }

  get url(): URL | undefined { return this._url; }
  set url(value: URL) {
    this._url = value;
    window.electronAPI.send(ich.setViewUrl, this.nodeId, value.toString());
  }
  get contextBehavior(): ContextBehavior {
    if (this._contextBehavior === undefined) return () => console.error("no contextbehavior");
    return this._contextBehavior;
  }
  set contextBehavior(value: ContextBehavior) { this._contextBehavior = value; }
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
  split(pos: Vector2, direction: Direction) {
    this.contextBehavior(this.nodeId, { option: ContextOption.Split, direction: direction }, pos);
  }
  delete() {
    this.contextBehavior(this.nodeId, { option: ContextOption.Delete });
  }
}

export class ColumnNode extends ContainerNode {
  private _children: BaseNode[];
  private _refreshRoot: React.DispatchWithoutAction;
  private _setRoot: React.Dispatch<React.SetStateAction<BaseNode>>;
  private _rootContextBehavior: ContextBehavior;
  private _handlePercents: number[];

  constructor({
    children: children,
    refreshRoot: forceState,
    setRoot: setRoot,
    rootContextBehavior: rootContextBehavior,
    handlePercents: handlePercents,
  }: ColumnNodeProps) {
    super();
    for (const child of children) child.parent = this;
    this._children = children;
    this._refreshRoot = forceState;
    this._setRoot = setRoot;
    this._handlePercents = handlePercents;
    this._rootContextBehavior = rootContextBehavior;
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
      thisNode={this}
    ></Column>;
  }

  get children(): BaseNode[] { return this._children; }
  set children(value: BaseNode[]) { this._children = value; }
  get refreshRoot(): React.DispatchWithoutAction { return this._refreshRoot; }
  set refreshRoot(value: React.DispatchWithoutAction) { this._refreshRoot = value; }
  get setRoot(): React.Dispatch<React.SetStateAction<BaseNode>> { return this._setRoot; }
  set setRoot(value: React.Dispatch<React.SetStateAction<BaseNode>>) { this._setRoot = value; }
  get rootContextBehavior(): ContextBehavior { return this._rootContextBehavior; }
  set rootContextBehavior(value: ContextBehavior) { this._rootContextBehavior = value; }
  get handlePercents(): number[] { return this._handlePercents; }
  set handlePercents(value: number[]) { this._handlePercents = value; }
}

export class RowNode extends ContainerNode {
  private _children: BaseNode[];
  private _refreshRoot: React.DispatchWithoutAction;
  private _setRoot: React.Dispatch<React.SetStateAction<BaseNode>>;
  private _rootContextBehavior: ContextBehavior;
  private _handlePercents: number[];

  constructor({
    children: children,
    refreshRoot: forceState,
    setRoot: setRoot,
    rootContextBehavior: rootContextBehavior,
    handlePercents: handlePercents,
  }: RowNodeProps) {
    super();
    for (const child of children) child.parent = this;
    this._children = children;
    this._refreshRoot = forceState;
    this._setRoot = setRoot;
    this._rootContextBehavior = rootContextBehavior;
    this._handlePercents = handlePercents;
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
      thisNode={this}
    ></Row>;
  }

  get children(): BaseNode[] { return this._children; }
  set children(value: BaseNode[]) { this._children = value; }
  get refreshRoot(): React.DispatchWithoutAction { return this._refreshRoot; }
  set refreshRoot(value: React.DispatchWithoutAction) { this._refreshRoot = value; }
  get setRoot(): React.Dispatch<React.SetStateAction<BaseNode>> { return this._setRoot; }
  set setRoot(value: React.Dispatch<React.SetStateAction<BaseNode>>) { this._setRoot = value; }
  get rootContextBehavior(): ContextBehavior { return this._rootContextBehavior; }
  set rootContextBehavior(value: ContextBehavior) { this._rootContextBehavior = value; }
  get handlePercents(): number[] { return this._handlePercents; }
  set handlePercents(value: number[]) { this._handlePercents = value; }
}