import { IpcRendererEvent } from "electron/renderer";
import { ReactElement, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Listener, Vector2 } from "../../../common/interfaces";
import * as ich from "../../../common/ipcChannels";
import { registerIpcListener } from "../../common/util";
import PieOverlay, { PieProps } from "./app-components/PieOverlay";

export default function Main(): ReactElement {
  const [pos, setPos] = useState<Vector2 | undefined>(undefined);
  const selectedTile = useRef<string | null>(null);

  // #region ipc listeners
  const listener1 = useRef<Listener>({
    channel: ich.showPieMenuCC,
    fn: (_: IpcRendererEvent, ...args: unknown[]) => {
      selectedTile.current = args[0] as string;
      const pos = args[1] as Vector2;
      setPos(pos);
    },
    uuid: uuidv4()
  });
  registerIpcListener(listener1.current);
  // #endregion

  useEffect(() => {
    if (pos !== undefined) setPos(undefined);
  }, [pos]);

  const buttons: PieProps = {
    middle: {
      icon: "add_link", opacity: 0.5, fn: () => {
        console.log(selectedTile.current);
      }
    },
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
    downRight: {
      icon: "delete", opacity: 0.5
    }
  };

  return (
    <PieOverlay
      className="w-screen h-screen overflow-hidden"
      scale={1.2}
      pos={pos}
      buttons={buttons}
    >
    </PieOverlay>
  );
}