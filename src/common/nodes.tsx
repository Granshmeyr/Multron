import { v4 as uuidv4 } from "uuid";
import { TileProps } from "./interfaces";

export const tiles: Record<string, TileNode> = {};

export class TileTree {
  root: BaseNode;

  constructor(root: BaseNode) {
    this.root = root;
    if (root instanceof TileNode && root.props.id) {
      tiles[root.props.id] = root;
    }
  }

  static getChild<T extends BaseNode>(
    node: ColumnNode | RowNode, index: number
  ) {
    return node.children[index] as T;
  }
}

export abstract class BaseNode {
  parent: BaseNode | null = null;
  children: BaseNode[] | null = null;
}

export class TileNode extends BaseNode {
  props: TileProps;
  ref: React.RefObject<HTMLDivElement> | null = null;

  constructor(tileProps?: TileProps, parent: ColumnNode | RowNode | null = null) {
    super();
    this.parent = parent;

    const id = tileProps?.id || uuidv4();
    const parsedProps = {
      className: tileProps?.className || undefined,
      style: tileProps?.style || undefined,
      url: tileProps?.url || undefined,
      splitBehavior: tileProps?.splitBehavior || (() => { console.log("no splitBehavior"); }),
      resizeBehavior: tileProps?.resizeBehavior || (() => { console.log("no resizeBehavior"); }),
      id: id,
    };
    this.props = parsedProps;
  }
}

export class ColumnNode extends BaseNode {
  children: BaseNode[];
  initialSplit?: number;

  constructor(
    children: BaseNode[],
    initialSplit?: number
  ) {
    super();
    this.initialSplit = initialSplit;
    this.children = children;
    for (const baseObject of children) {
      if (baseObject instanceof TileNode) {
        baseObject.parent = this;
      }
    }
  }
}

export class RowNode extends BaseNode {
  children: BaseNode[];
  initialSplit?: number;

  constructor(
    children: BaseNode[],
    initialSplit?: number
  ) {
    super();
    this.initialSplit = initialSplit;
    this.children = children;
    for (const baseObject of children) {
      if (baseObject instanceof TileNode) {
        baseObject.parent = this;
      }
    }
  }
}

export function newTile(tileProps?: TileProps): TileNode {
  let tileNode: TileNode;
  if (tileProps !== undefined) {
    tileNode = new TileNode(tileProps);
  }
  else {
    tileNode = new TileNode();
  }
  tiles[tileNode.props.id as unknown as number] = tileNode;
  return tileNode;
}
