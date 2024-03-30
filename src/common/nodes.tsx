import React from "react";
import { v4 as uuidv4 } from "uuid";
import { TileBehaviors, TileProps } from "./props";

export class TileTree {
  nodeRecord: Record<string, TileNode> = {};
  refRecord: Record<string, React.RefObject<HTMLDivElement>> = {};
  root: BaseNode;

  constructor(root: BaseNode) {
    this.root = root;
    if (root instanceof TileNode && root.props.id) {
      this.nodeRecord[root.props.id] = root;
    }
  }

  static getChild<T extends BaseNode>(
    node: ColumnNode | RowNode, index: number
  ) {
    return node.children[index] as T;
  }

  newTile(behaviors: TileBehaviors, props?: TileProps): TileNode {
    const tileNode = new TileNode(behaviors, props);
    if (tileNode.props.id) {
      this.nodeRecord[tileNode.props.id] = tileNode;
    }
    else {
      tileNode.props.id = uuidv4();
    }
    return tileNode;
  }
}

export abstract class BaseNode {
  parent: BaseNode | null = null;
  children: BaseNode[] | null = null;
}

export class TileNode extends BaseNode {
  props: TileProps;

  constructor(behaviors: TileBehaviors, props?: TileProps, parent: ColumnNode | RowNode | null = null) {
    super();
    this.parent = parent;

    const id = props?.id || uuidv4();
    const parsedProps = {
      ...props,
      id: id,
      splitBehavior: behaviors.splitBehavior,
      resizeBehavior: behaviors.resizeBehavior
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
