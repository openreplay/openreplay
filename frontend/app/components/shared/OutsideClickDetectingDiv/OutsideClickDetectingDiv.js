import { findDOMNode } from 'react-dom';
import React, { useRef, useLayoutEffect } from "react";

let refs = [];
let callbacks = [];

function addOutsideClickListener(ref, callback) {
  refs.push(ref);
  callbacks.push(callback);
}

function removeOutsideClickListener(ref) {
  const index = refs.indexOf(ref);
  if (index === -1) return;
  refs.splice(index, 1);
  callbacks.splice(index, 1);
}

function handleClickOutside(e) {
  refs.forEach((ref, i) => {
    if (ref.current !== null) {
      const node = findDOMNode(ref.current);
      if (node && !node.contains(e.target)) {
        callbacks[i](e);
      }
    }
  }) 
}

document.addEventListener('click', handleClickOutside);

function OutsideClickDetectingDiv({ onClickOutside, children, ...props}) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onClickOutside(event);
      }
    }

    addOutsideClickListener(ref, handleClickOutside);
    return () => removeOutsideClickListener(ref);
  }, [ ref ]);

  return <div ref={ref} {...props}>{children}</div>;
}

export default React.memo(OutsideClickDetectingDiv);
