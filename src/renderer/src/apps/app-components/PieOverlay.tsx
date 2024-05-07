import { IconButton } from "@mui/material";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Listener, Vector2 } from "../../../../common/interfaces";
import * as ich from "../../../../common/ipcChannels";
import { registerIpcListener, screenToWorkAreaPos as screenToOverlayPos } from "../../../common/util";

interface ButtonProps {
  icon?: string,
  opacity?: number,
  fn?: () => void,
}
export interface PieProps {
  middle?: ButtonProps,
  up?: ButtonProps,
  down?: ButtonProps,
  left?: ButtonProps,
  right?: ButtonProps,
  upLeft?: ButtonProps,
  upRight?: ButtonProps,
  downLeft?: ButtonProps,
  downRight?: ButtonProps,
}
export interface PieOverlayProps {
  id?: string,
  className?: string,
  style?: React.CSSProperties,
  scale?: number,
  pos?: Vector2,
  buttons?: PieProps,
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
  const click = useRef<Vector2 | null>(null);
  const origin = useRef<Vector2>({ x: 0, y: 0});
  const pieRef = useRef<HTMLDivElement>(null);

  // #region ipc listeners
  const listener1 = useRef<Listener>({
    channel: ich.overlayBlur,
    fn: () => { hide(); },
    uuid: uuidv4()
  });
  registerIpcListener(listener1.current);
  // #endregion

  useEffect(() => {
    if (pos !== undefined) {
      click.current = screenToOverlayPos(pos);
      setWantToShow(true);
    }

    if (wantToShow && pieRef.current !== null) {
      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const mousePos = click.current!;
      const pie = pieRef.current.getBoundingClientRect();
      const radX = pie.width / 2;
      const radY = pie.height / 2;

      const up = mousePos.y < radY;
      const down = mousePos.y + radY > winH;
      const left = mousePos.x < radX;
      const right = mousePos.x + radX > winW;

      if (!up && !down && !left && !right) {
        origin.current = mousePos;
      } else if (up && left) {
        origin.current = { x: radX, y: radY };
      } else if (up && right) {
        origin.current = { x: winW - radX, y: radY };
      } else if (down && left) {
        origin.current = { x: radX, y: winH - radY };
      } else if (down && right) {
        origin.current = { x: winW - radX, y: winH - radY };
      } else if (up) {
        origin.current = { x: mousePos.x, y: radY };
      } else if (down) {
        origin.current = { x: mousePos.x, y: winH - radY };
      } else if (left) {
        origin.current = { x: radX, y: mousePos.y };
      } else {
        origin.current = { x: winW - radX, y: mousePos.y };
      }

      setVisible(true);
    }
  }, [pos, wantToShow]);

  function hide() {
    origin.current = { x: 0, y: 0 };
    setWantToShow(false);
    setVisible(false);
  }
  function onContextMenu(e: React.MouseEvent) {
    click.current = { x: e.clientX, y: e.clientY };
    setWantToShow(true);
  }
  function onMouseDown() {
    hide();
  }

  return (
    <div
      id={id}
      className={`relative ${className}`}
      style={style}
      onContextMenu={onContextMenu}
      onMouseDown={onMouseDown}
    >
      {wantToShow && origin.current !== null && (
        <div
          className="flex absolute justify-center items-center"
          ref={pieRef}
          style={{
            visibility: visible ? "visible" : "hidden",
            left: `${origin.current.x}px`,
            top: `${origin.current.y}px`,
            transform: `translate(-50%, -50%) ${scale !== undefined ? `scale(${scale})` : ""}`
          }}
        >
          <Pie
            middle={buttons?.middle}
            up={buttons?.up}
            down={buttons?.down}
            left={buttons?.left}
            right={buttons?.right}
            upLeft={buttons?.upLeft}
            upRight={buttons?.upRight}
            downLeft={buttons?.downLeft}
            downRight={buttons?.downRight}
          ></Pie>
        </div>
      )}
    </div>
  );
}

function Pie(props: PieProps): ReactElement {
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
  function Button({ button }: { button?: ButtonProps }): ReactElement {
    if (button === undefined) {
      return <div></div>;
    }
    return (
      <IconButton
        onClick={() => {
          if (button.fn !== undefined) button.fn();
          else console.log("default button fn");
        }}
        onContextMenu={(e) => { e.stopPropagation(); }}
        onMouseDown={(e) => { e.stopPropagation(); }}
        onMouseEnter={() => { window.electronAPI.send(ich.setOverlayIgnore, false); }}
        onMouseLeave={() => { window.electronAPI.send(ich.setOverlayIgnore, true); }}
      >
        <MaterialIcon style={button.opacity !== undefined ? { opacity: button.opacity } : undefined}>
          {button.icon !== undefined ? button.icon : "error"}
        </MaterialIcon>
      </IconButton>
    );
  }

  if (Object.values(props).every((v) => v === undefined)
  ) {
    return <></>;
  }
  return (
    <div className="pie-grid" ref={ref}>
      {<Button button={props.upLeft}   />} {<Button button={props.up}     />} {<Button button={props.upRight}   />}
      {<Button button={props.left}     />} {<Button button={props.middle} />} {<Button button={props.right}     />}
      {<Button button={props.downLeft} />} {<Button button={props.down}   />} {<Button button={props.downRight} />}
    </div>
  );
}