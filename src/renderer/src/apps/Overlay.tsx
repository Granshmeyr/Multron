import { ReactElement, useEffect, useRef, useState } from "react";
import { Listener, Vector2 } from "../../../common/interfaces";
import * as ich from "../../../common/ipcChannels";
import PieWrapper from "./app-components/PieWrapper";
import { IpcRendererEvent } from "electron/renderer";
import { v4 as uuidv4 } from "uuid";

export default function Main(): ReactElement {
  const [pos, setPos] = useState<Vector2 | undefined>(undefined);

  // #region listeners
  const listener1 = useRef<Listener>({
    fn: (_: IpcRendererEvent, ...args: unknown[]) => {
      setPos(args[0] as Vector2);
    },
    uuid: uuidv4()
  });
  if (!window.electronAPI.isListening(ich.showOverlayResponse, listener1.current.uuid)) {
    window.electronAPI.on(ich.showOverlayResponse, listener1.current.uuid, listener1.current.fn);
  }
  // #endregion

  useEffect(() => {
    console.log(`pos: ${pos?.x}, ${pos?.y}`);
    if (pos !== undefined) setPos(undefined);
  }, [pos]);

  return (
    <PieWrapper
      className="w-screen h-screen"
      scale={1.2}
      pos={pos}
      buttons={{
        up: {
          icon: "splitscreen_top"
        },
        down: {
          icon: "splitscreen_bottom"
        },
        left: {
          icon: "splitscreen_left"
        },
        right: {
          icon: "splitscreen_right"
        },
        middle: {
          icon: "add_link", opacity: 0.5
        },
        downRight: {
          icon: "delete", opacity: 0.5
        }
      }}
    >
    </PieWrapper>
  );
}