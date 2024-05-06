import { IconButton } from "@mui/material";
import React, { ReactElement, useEffect, useRef, useState } from "react";
import { Vector2 } from "../../../../common/interfaces";

interface ButtonProps {
  icon?: string,
  opacity?: number,
  fn?: (...args: unknown[]) => unknown,
}
export interface PieButtonProps {
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
export interface PieProps {
  id?: string,
  children?: React.ReactNode,
  className?: string,
  style?: React.CSSProperties,
  scale?: number,
  pos?: Vector2,
  buttons?: PieButtonProps,
}

export default function Main({
  id,
  children,
  className,
  style,
  scale,
  pos,
  buttons,
}: PieProps): React.ReactElement {
  const [wantToShow, setWantToShow] = useState<boolean>(false);
  const [visible, setVisible] = useState<boolean>(false);
  const click = useRef<Vector2 | null>(null);
  const origin = useRef<Vector2>({ x: 0, y: 0});
  const rootRef = useRef<HTMLDivElement>(null);
  const pieRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseOut(e: MouseEvent) {
      if (!e.relatedTarget || (e.relatedTarget as HTMLElement).nodeName === "HTML") {
        hide();
      }
    }

    window.addEventListener("mouseout", onMouseOut);

    if (pos !== undefined) {
      click.current = pos;
      setWantToShow(true);
    }

    if (wantToShow && pieRef.current !== null) {
      const posAbs = click.current!;
      const winH = window.innerHeight;
      const winW = window.innerWidth;
      const pie = pieRef.current.getBoundingClientRect();
      const radX = pie.width / 2;
      const radY = pie.height / 2;
      let up = false;
      let down = false;
      let left = false;
      let right = false;
      if (posAbs.y - radY < 0) {
        up = true;
      }
      if (posAbs.y + radY > winH) {
        down = true;
      }
      if (posAbs.x - radX < 0) {
        left = true;
      }
      if (posAbs.x + radX > winW) {
        right = true;
      }
      switch (true) {
      case ( up && !down && !left && !right):
        origin.current = { x: posAbs.x,    y: radY };        break;
      case (!up &&  down && !left && !right):
        origin.current = { x: posAbs.x,    y: winH - radY }; break;
      case (!up && !down &&  left && !right):
        origin.current = { x: radX,        y: posAbs.y };    break;
      case (!up && !down && !left &&  right):
        origin.current = { x: winW - radX, y: posAbs.y };    break;
      case ( up && !down &&  left && !right):
        origin.current = { x: radX,        y: radY };        break;
      case ( up && !down && !left &&  right):
        origin.current = { x: winW - radX, y: radY };        break;
      case (!up &&  down &&  left && !right):
        origin.current = { x: radY,        y: winH - radY }; break;
      case (!up &&  down && !left &&  right):
        origin.current = { x: winW - radX, y: winH - radY }; break;
      default:
        origin.current = click.current!;
      }
      setVisible(true);

      return () => {
        window.removeEventListener("mouseout", onMouseOut);
      };
    }
  }, [pos, wantToShow]);

  function hide() {
    origin.current = { x: 0, y: 0 };
    setWantToShow(false);
    setVisible(false);
  }
  function onMouseDown(e: React.MouseEvent) {
    if (e.button !== 2) {
      hide();
      return;
    }
    click.current = { x: e.clientX, y: e.clientY };
    setWantToShow(true);
  }

  return (
    <div
      id={id}
      className={`"relative" ${className}`}
      style={style}
      onMouseDown={onMouseDown}
      ref={rootRef}
    >
      {children}
      {wantToShow && origin.current !== null && (
        <div
          className="flex absolute justify-center items-center"
          ref={pieRef}
          style={{
            visibility: visible ? "visible" : "hidden",
            left: `${origin.current.x}px`,
            top: `${origin.current.y}px`,
            transform: (() => {
              const base = "translate(-50%, -50%)";
              return scale !== undefined ? base + ` scale(${scale})` : base;
            })()
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
}: PieButtonProps): ReactElement {
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
  function Button({ props }: { props?: ButtonProps }): ReactElement {
    if (props === undefined) {
      return <div></div>;
    }
    return (
      <IconButton onClick={ (e) => {e.stopPropagation();} }>
        <MaterialIcon style={props.opacity !== undefined ? { opacity: props.opacity } : undefined}>
          {props.icon !== undefined ? props.icon : "error"}
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
    downRight].every((value) => value === undefined)
  ) {
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