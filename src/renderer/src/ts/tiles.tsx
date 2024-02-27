import { useState } from 'react';
import { showSplitMenu } from './ui';
import { nestElement, concatElements } from './util';

enum Split { Up, Down, Left, Right }

export function ScreenTile(): JSXElement {
  const [splitDirection, setSplitDirection] = useState<Split | null>(null);

  function original(): JSXElement {
    if (splitDirection == null) {
      return <div
        className="flex h-screen w-screen bg-red-500"
        onContextMenu={(e) => showSplitMenu(e)}>
      </div>;
    }
    return (<div
      className="flex h-screen w-screen bg-green-500">
    </div>);
  }

  function split(): JSXElement {
    return <h1>hello</h1>;
  }

  return splitDirection == null ? original() : split();
}

export function HorizontalTile(): JSXElement {
  return <div
    className="flex-row flex-grow bg-green-300">
  </div>;
}

export function VerticalTile(): JSXElement {
  return <div
    className="flex-col flex-grow bg-red-400">
  </div>;
}

export function Tile(): JSXElement {
  return <div
    className="flex flex-grow bg-lime-800"
    onContextMenu={ (e) => showSplitMenu(e) }>
  </div>;
}

export function ConstructHorizontal(child: JSXElement): JSXElement  {
  return nestElement(
    HorizontalTile(),
    concatElements(child, Tile())
  );
}