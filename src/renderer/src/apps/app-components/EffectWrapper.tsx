import { ReactElement, ReactNode, RefObject, useEffect, useRef } from "react";

interface RefWrapperProps {
    children: ReactNode,
    className?: string,
    fn: (ref: RefObject<HTMLDivElement>) => void
}

export default function Main({
  children,
  className,
  fn
}: RefWrapperProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fn(ref);
  });
  return (
    <div
      className={className}
      ref={ref}
    >
      {children}
    </div>
  );
}