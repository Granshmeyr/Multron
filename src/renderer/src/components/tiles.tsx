import { useState } from 'react';
import { concatElement, nestElement } from './util';
import { Split } from '../../../common/enums';

let registered: boolean = false;

export function ScreenTile(): JSXElement {
  const [splitDirection, setSplitDirection] = useState<Split | null>(null);

  function unsplit(): JSXElement {
    if (splitDirection == null) {
      return <div
        className="flex h-screen w-screen bg-red-500"
        onContextMenu={async () => {
          const result: Split | null = await showSplitMenu();
          if (result == null) {
            return;
          }
          setSplitDirection(result);
        }}>
      </div>;
    }
    return (<div
      className="flex h-screen w-screen bg-green-500">
    </div>);
  }

  function split(): JSXElement {
    return <h1>hello</h1>;
  }

  return splitDirection == null ? unsplit() : split();
}

export function RowTile(): JSXElement {
  return <div
    className="flex-row flex-grow bg-green-300">
  </div>;
}

export function ColumnTile(): JSXElement {
  return <div
    className="flex-col flex-grow bg-red-400">
  </div>;
}

export function Tile(): JSXElement {
  return <div
    className="flex flex-grow bg-lime-800"
    // @ts-expect-error electron exposed interface
    onContextMenu={ () => window.electron.showSplitMenu() }>
  </div>;
}

export function ConstructHorizontal(child: JSXElement): JSXElement  {
  return nestElement(
    RowTile(),
    concatElement(child, Tile())
  );
}

async function showSplitMenu(): Promise<Split | null> {
  return new Promise<Split | null>((resolve) => {
    function listener(_event: Electron.IpcRendererEvent, ...args: unknown[]): void {
      registered = false;
      resolve(args[0] as (Split | null));
    }

    window.electronAPI.send('show-split-menu');
    if (!registered) {
      window.electronAPI.once('show-split-menu-response', listener);
      registered = true;
    }
  });
}
