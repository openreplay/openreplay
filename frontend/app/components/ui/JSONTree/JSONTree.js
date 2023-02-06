import React from 'react';
import JSONTree from 'react-json-view';

function updateObjectLink(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return [ ...obj ];
  return { ...obj }
}

export default ({ src, ...props }) => (
  <JSONTree
    name={ false }
    collapsed={ 1 }
    enableClipboard={ false }
    iconStyle="circle"
    indentWidth={ 1 }
    sortKeys
    displayDataTypes={ false }
    displayObjectSize={ false }
    src={ updateObjectLink(src) }
    iconStle="triangle"
    { ...props }
  />
);
