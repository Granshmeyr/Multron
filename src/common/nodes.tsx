import { ReactElement } from "react";
import { Tile, Column, Row } from "../renderer/src/components/TileApp";
import { v4 as uuidv4 } from "uuid";
import { TileProps } from "./props";

export class TileTree {
  record: Record<string, TileNode> = {};
  root: BaseNode;

  constructor(root: BaseNode) {
    this.root = root;
    if (root instanceof TileNode && root.props.id) {
      this.record[root.props.id] = root;
    }
  }

  static getChild<T extends BaseNode>(
    node: ColumnNode | RowNode, index: number
  ) {
    return node.children[index] as T;
  }

  newTile(props?: TileProps): TileNode {
    const tileNode = new TileNode(props);
    if (tileNode.props.id) {
      this.record[tileNode.props.id] = tileNode;
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
  abstract toElement(): ReactElement;
}

export class TileNode extends BaseNode {
  props: TileProps;

  constructor(props?: TileProps, parent: ColumnNode | RowNode | null = null) {
    super();
    this.parent = parent;

    const id = props?.id || uuidv4();
    let splitBehavior = props?.splitBehavior;
    if (!splitBehavior) {
      splitBehavior = () => {};
    }
    let resizeBehavior = props?.resizeBehavior;
    if (!resizeBehavior) {
      resizeBehavior = () => {};
    }
    const parsedProps = {
      ...props,
      id: id,
      splitBehavior: splitBehavior,
      resizeBehavior: resizeBehavior
    };
    this.props = parsedProps;
  }

  toElement(): ReactElement {
    return <Tile key={this.props.id} {...this.props}></Tile>;
  }
}

export class ColumnNode extends BaseNode {
  tileTree: TileTree;
  forceState: React.DispatchWithoutAction;
  children: BaseNode[];
  initialSplit?: number;

  constructor(
    tileTree: TileTree,
    forceState: React.DispatchWithoutAction,
    children: BaseNode[],
    initialSplit?: number
  ) {
    super();
    this.tileTree = tileTree;
    this.forceState = forceState;
    this.initialSplit = initialSplit;
    this.children = children;
    for (const baseObject of children) {
      if (baseObject instanceof TileNode) {
        baseObject.parent = this;
      }
    }
  }

  toElement(): ReactElement {
    return ColumnNode.buildElement(this);
  }

  static buildElement(columnObject: ColumnNode): ReactElement {
    const elementArray: ReactElement[] = columnObject.children.map(child => {
      if (child instanceof ColumnNode) {
        return ColumnNode.buildElement(child);
      }
      else {
        return child.toElement();
      }
    });
    return <Column
      forceState={columnObject.forceState}
      tileTree={columnObject.tileTree}
      initialSplit={columnObject.initialSplit}
    >{elementArray}</Column>;
  }
}

export class RowNode extends BaseNode {
  tileTree: TileTree;
  forceState: React.DispatchWithoutAction;
  children: BaseNode[];
  initialSplit?: number;

  constructor(
    tileTree: TileTree,
    forceState: React.DispatchWithoutAction,
    children: BaseNode[],
    initialSplit?: number
  ) {
    super();
    this.tileTree = tileTree;
    this.forceState = forceState;
    this.initialSplit = initialSplit;
    this.children = children;
    for (const baseObject of children) {
      if (baseObject instanceof TileNode) {
        baseObject.parent = this;
      }
    }
  }

  toElement(): ReactElement {
    return RowNode.buildElement(this);
  }

  static buildElement(rowObject: RowNode): ReactElement {
    const elementArray: ReactElement[] = rowObject.children.map(child => {
      if (child instanceof RowNode) {
        return RowNode.buildElement(child);
      }
      else {
        return child.toElement();
      }
    });
    return <Row
      forceState={rowObject.forceState}
      tileTree={rowObject.tileTree}
      initialSplit={rowObject.initialSplit}
    >{elementArray}</Row>;
  }
}
