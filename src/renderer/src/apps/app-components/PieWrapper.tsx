import { IconButton } from "@mui/material";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Vector2 } from "../../../../common/interfaces";

interface ButtonProps {
  icon?: string,
  opacity?: number,
  fn?: (...args: unknown[]) => unknown,
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

export default function Main({
  children,
  buttons
}: { children: React.ReactNode, buttons?: PieProps }): React.ReactElement {
  const [showPie, setShowPie] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const origin = useRef<Vector2 | null>(null);
  const mousePos = useRef<Vector2 | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showPie && pieRef.current !== null) {
      const pos = origin.current!;
      const winHeight = window.innerHeight;
      const winWidth = window.innerWidth;
      const pie = pieRef.current.getBoundingClientRect();
      const radiusX = pie.width / 2;
      const radiusY = pie.height / 2;
      let up = false;
      let down = false;
      let left = false;
      let right = false;
      if (pos.y - radiusY < 0) {
        up = true;
      }
      if (pos.y + radiusY > winHeight) {
        down = true;
      }
      if (pos.x - radiusX < 0) {
        left = true;
      }
      if (pos.x + radiusX > winWidth) {
        right = true;
      }
      switch (true) {
      case (up && !down && !left && !right):
        origin.current = { x: pos.x, y: radiusY };                          break;
      case (!up && down && !left && !right):
        origin.current = { x: pos.x, y: winHeight - radiusY };              break;
      case (!up && !down && left && !right):
        origin.current = { x: radiusX, y: pos.y };                          break;
      case (!up && !down && !left && right):
        origin.current = { x: winWidth - radiusX, y: pos.y };               break;
      case (up && !down && left && !right):
        origin.current = { x: radiusX, y: radiusY };                        break;
      case (up && !down && !left && right):
        origin.current = { x: winWidth - radiusX, y: radiusY };             break;
      case (!up && down && left && !right):
        origin.current = { x: radiusY, y: winHeight - radiusY };            break;
      case (!up && down && !left && right):
        origin.current = { x: winWidth - radiusX, y: winHeight - radiusY }; break;
      }
      setVisible(true);
    }
  }, [showPie]);

  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 2) show(e);
  }
  function onMouseUp(e: React.MouseEvent) {
    if (e.button === 2) hide();
  }
  function onMouseLeave() {
    hide();
  }
  function onMouseMove(e: React.MouseEvent) {
    const c = rootRef.current;
    if (c === null) {
      return;
    }
    mousePos.current = { x: e.clientX, y: e.clientY };

  }
  function show(e: React.MouseEvent) {
    origin.current = { x: e.clientX, y: e.clientY };
    setShowPie(true);
  }
  function hide() {
    origin.current = null;
    setShowPie(false);
    setVisible(false);
  }

  return (
    <div
      className="relative overflow-hidden"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseDown={onMouseDown}
      onMouseLeave={onMouseLeave}
      ref={rootRef}
    >
      {children}
      {showPie && origin.current !== null && (
        <div
          className="flex absolute justify-center items-center"
          ref={pieRef}
          style={{
            visibility: visible ? "visible" : "hidden",
            left: `${origin.current.x}px`,
            top: `${origin.current.y}px`,
            transform: "translate(-50%, -50%)"
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

function Pie({
  middle,
  up,
  down,
  left,
  right,
  upLeft,
  upRight,
  downLeft,
  downRight
}: PieProps): ReactElement {
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
          textShadow: "0 0 5px rgba(0, 0, 0, 0.3)",
          ...style
        }}
      >
        {children}
      </span>
    );
  }
  function Button({ props }: { props?: ButtonProps }): ReactElement {
    if (props === undefined) {
      return <div></div>;
    }
    return (
      <IconButton onClick={props.fn ? props.fn : () => console.log("pressed pie")}>
        <MaterialIcon style={props.opacity ? { opacity: props.opacity } : undefined}>
          {props.icon ? props.icon : "error"}
        </MaterialIcon>
      </IconButton>
    );
  }

  if ([
    middle,
    up,
    down,
    left,
    right,
    upLeft,
    upRight,
    downLeft,
    downRight
  ].every((value) => value === undefined)) {
    return <></>;
  }
  return (
    <div className="pie-grid" ref={ref}>
      {<Button props={upLeft}   />} {<Button props={up}     />} {<Button props={upRight}   />}
      {<Button props={left}     />} {<Button props={middle} />} {<Button props={right}     />}
      {<Button props={downLeft} />} {<Button props={down}   />} {<Button props={downRight} />}
    </div>
  );
}