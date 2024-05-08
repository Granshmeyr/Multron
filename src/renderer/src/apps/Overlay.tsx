import { IpcRendererEvent } from "electron/renderer";
import { ReactElement, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ContextParams, Listener, Vector2 } from "../../../common/interfaces";
import * as ich from "../../../common/ipcChannels";
import { registerIpcListener } from "../../common/util";
import PieOverlay, { ButtonListenerProps, PieProps } from "./app-components/PieOverlay";
import { ContextOption, Direction } from "../../../common/enums";

export default function Main(): ReactElement {
  const [pos, setPos] = useState<Vector2 | undefined>(undefined);
  const idRef = useRef<string | null>(null);
  const lastClick = useRef<Vector2 | null>(null);

  // #region ipc listeners

  const listener1 = useRef<Listener>({
    channel: ich.showPieMenuCC,
    fn: (_: IpcRendererEvent, ...args: unknown[]) => {
      idRef.current = args[0] as string;
      const pos: Vector2 = args[1] as Vector2;
      setPos(pos);
      lastClick.current = pos;
    },
    uuid: uuidv4()
  });
  registerIpcListener(listener1.current);
  // #endregion

  useEffect(() => {
    if (pos !== undefined) setPos(undefined);
  }, [pos]);

  const commonListeners: ButtonListenerProps = {
    onMouseEnter: () => window.electronAPI.send(ich.setOverlayIgnore, false),
    onMouseLeave: () => window.electronAPI.send(ich.setOverlayIgnore, true)
  };
  const buttons: PieProps = {
    middle: {
      icon: "add_link", opacity: 0.5, listeners: {
        ...commonListeners,
        onClick: () => { console.log(`selected tile ${idRef.current}`); },
      }
    },
    up: {
      icon: "splitscreen_top", listeners: {
        ...commonListeners,
        onClick: () => {
          window.electronAPI.send(
            ich.callTileContextBehavior,
            idRef.current,
            { option: ContextOption.Split, direction: Direction.Up },
            { x: lastClick.current!.x, y: lastClick.current!.y }
          );
        }
      }
    },
    down: {
      icon: "splitscreen_bottom", listeners: {
        ...commonListeners,
        onClick: () => {
          window.electronAPI.send(
            ich.callTileContextBehavior,
            idRef.current,
            { option: ContextOption.Split, direction: Direction.Down },
            { x: lastClick.current!.x, y: lastClick.current!.y }
          );
        }
      }
    },
    left: {
      icon: "splitscreen_left", listeners: {
        ...commonListeners,
        onClick: () => {
          window.electronAPI.send(
            ich.callTileContextBehavior,
            idRef.current,
            { option: ContextOption.Split, direction: Direction.Left },
            { x: lastClick.current!.x, y: lastClick.current!.y }
          );
        }
      }
    },
    right: {
      icon: "splitscreen_right", listeners: {
        ...commonListeners,
        onClick: () => {
          window.electronAPI.send(
            ich.callTileContextBehavior,
            idRef.current,
            { option: ContextOption.Split, direction: Direction.Right },
            { x: lastClick.current!.x, y: lastClick.current!.y }
          );
        }
      }
    },
    downRight: {
      icon: "delete", opacity: 0.5, listeners: {
        ...commonListeners,
        onClick: () => {
          window.electronAPI.send(ich.callTileContextBehavior, idRef.current, {
            option: ContextOption.Delete
          } as ContextParams);
        }
      }
    }
  };

  return (
    <div onMouseDown={() => { window.electronAPI.send(ich.setOverlayIgnore, true); }}>
      <PieOverlay
        className="w-screen h-screen overflow-hidden"
        scale={1.2}
        pos={pos}
        buttons={buttons}
      />
    </div>
  );
}