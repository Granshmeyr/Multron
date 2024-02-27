import React from 'react';

export function nestElement(
  outerDiv: JSXElement,
  innerDiv: JSXElement
): JSXElement {
  const nestedDiv = React.cloneElement(outerDiv, {}, innerDiv);
  return nestedDiv;
}

export function concatElements(...elements: JSXElement[]): JSXElement {
  return (
    <>
      {elements.map((element, index) => (
        <React.Fragment key={index}>{element}</React.Fragment>
      ))}
    </>
  );
}