import { IconButton } from "@mui/material";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { IpcListener, Vector2 } from "../../../../common/interfaces";
import * as ich from "../../../../common/ipcChannels";
import { registerIpcListener, unregisterIpcListener } from "../../../common/util";

interface PieButtonProps {
  icon?: string,
  opacity?: number,
  listeners?: PieButtonListenerProps
}
interface PieFunctions {
  hide: () => void
}
export interface PieButtonListenerProps {
  onClick?: (e: React.MouseEvent, pieFunctions: PieFunctions) => void,
  onMouseEnter?: (e: React.MouseEvent) => void,
  onMouseLeave?: (e: React.MouseEvent) => void,
}
export interface PieButtonColProps {
  middle?: PieButtonProps,
  up?: PieButtonProps,
  down?: PieButtonProps,
  left?: PieButtonProps,
  right?: PieButtonProps,
  upLeft?: PieButtonProps,
  upRight?: PieButtonProps,
  downLeft?: PieButtonProps,
  downRight?: PieButtonProps,
}
interface PieProps {
  buttons?: PieButtonColProps,
  pieFunctions: PieFunctions
}
export interface PieOverlayProps {
  id?: string,
  className?: string,
  style?: React.CSSProperties,
  scale?: number,
  pos?: Vector2,
  buttons?: PieButtonColProps,
}

export default function Main({
  id,
  className,
  style,
  scale,
  pos,
  buttons,
}: PieOverlayProps): React.ReactElement {
  const [wantToShow, setWantToShow] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const tryPos = useRef<Vector2 | null>(null);
  const realPos = useRef<Vector2>({ x: 0, y: 0});
  const pieRef = useRef<HTMLDivElement>(null);
  const overlayBlurListener = useRef<IpcListener>({
    uuid: "9de9c9c2-f51d-47bb-9c25-e697a58ba933",
    fn: () => { hide(); },
  });

  useEffect(() => {
    const listener = overlayBlurListener.current;

    registerIpcListener(ich.overlayBlur, listener);
    if (pos !== undefined) {
      tryPos.current = pos;
      setWantToShow(true);
    }

    if (wantToShow && pieRef.current !== null) {
      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const mousePos = tryPos.current!;
      const pie = pieRef.current.getBoundingClientRect();
      const radX = pie.width / 2;
      const radY = pie.height / 2;

      const up = mousePos.y < radY;
      const down = mousePos.y + radY > winH;
      const left = mousePos.x < radX;
      const right = mousePos.x + radX > winW;

      if (!up && !down && !left && !right) {
        realPos.current = mousePos;
      } else if (up && left) {
        realPos.current = { x: radX, y: radY };
      } else if (up && right) {
        realPos.current = { x: winW - radX, y: radY };
      } else if (down && left) {
        realPos.current = { x: radX, y: winH - radY };
      } else if (down && right) {
        realPos.current = { x: winW - radX, y: winH - radY };
      } else if (up) {
        realPos.current = { x: mousePos.x, y: radY };
      } else if (down) {
        realPos.current = { x: mousePos.x, y: winH - radY };
      } else if (left) {
        realPos.current = { x: radX, y: mousePos.y };
      } else {
        realPos.current = { x: winW - radX, y: mousePos.y };
      }
      setVisible(true);

      return () => {
        unregisterIpcListener(ich.overlayBlur, listener);
      };
    }
  }, [pos, wantToShow]);

  function hide() {
    realPos.current = { x: 0, y: 0 };
    setWantToShow(false);
    setVisible(false);
  }
  function onContextMenu(e: React.MouseEvent) {
    tryPos.current = { x: e.clientX, y: e.clientY };
    setWantToShow(true);
  }

  return (
    <div
      id={id}
      className={`relative ${className}`}
      style={style}
      onContextMenu={onContextMenu}
    >
      {wantToShow && realPos.current !== null && (
        <div
          className="flex absolute justify-center items-center"
          ref={pieRef}
          style={{
            visibility: visible ? "visible" : "hidden",
            left: `${realPos.current.x}px`,
            top: `${realPos.current.y}px`,
            transform: `translate(-50%, -50%) ${scale !== undefined ? `scale(${scale})` : ""}`
          }}
        >
          <Pie
            buttons={{
              middle: buttons?.middle,
              up: buttons?.up,
              down: buttons?.down,
              left: buttons?.left,
              right: buttons?.right,
              upLeft: buttons?.upLeft,
              upRight: buttons?.upRight,
              downLeft: buttons?.downLeft,
              downRight: buttons?.downRight
            }}
            pieFunctions={{ hide: hide }}
          ></Pie>
        </div>
      )}
    </div>
  );
}

function Pie({ buttons, pieFunctions }: PieProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.classList.add("fade-in");
    }
  });

  interface MaterialIconProps {
    children: React.ReactNode,
    style?: React.CSSProperties
  }
  function MaterialIcon({ children, style }: MaterialIconProps): ReactElement {
    return (
      <span
        className="
          flex
          justify-center
          items-center
          scale-[1.25]
          material-symbols-outlined"
        style={{
          textShadow: "0 0 10px rgba(0, 0, 0, 1)",
          WebkitTextStroke: "0.7px #000000EE",
          ...style
        }}
      >
        {children}
      </span>
    );
  }
  function Button({ button }: { button?: PieButtonProps }): ReactElement {
    const listeners: PieButtonListenerProps | undefined = button?.listeners;
    if (button === undefined) {
      return <div></div>;
    }
    return (
      <IconButton
        onClick={(e) => {
          e.stopPropagation();
          if (listeners?.onClick !== undefined) listeners.onClick(
            e,
            { hide: pieFunctions.hide }
          );
          else console.log("default button fn");
        }}
        onContextMenu={(e) => { e.stopPropagation(); }}
        onMouseDown={(e) => { e.stopPropagation(); }}
        onMouseEnter={(e) => { if (listeners?.onMouseEnter !== undefined) listeners.onMouseEnter(e); }}
        onMouseLeave={(e) => { if (listeners?.onMouseLeave !== undefined) listeners.onMouseLeave(e); }}
      >
        <MaterialIcon style={button.opacity !== undefined ? { opacity: button.opacity } : undefined}>
          {button.icon !== undefined ? button.icon : "error"}
        </MaterialIcon>
      </IconButton>
    );
  }

  if (buttons === undefined) return <></>;
  return (
    <div className="pie-grid" ref={ref}>
      {<Button button={buttons.upLeft}   />} {<Button button={buttons.up}     />} {<Button button={buttons.upRight}   />}
      {<Button button={buttons.left}     />} {<Button button={buttons.middle} />} {<Button button={buttons.right}     />}
      {<Button button={buttons.downLeft} />} {<Button button={buttons.down}   />} {<Button button={buttons.downRight} />}
    </div>
  );
}