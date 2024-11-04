
/* Auto-generated, do not edit */
import React from 'react';

interface Props {
    size?: number | string;
    width?: number | string;
    height?: number | string;
    fill?: string;
}

function Circle(props: Props) {
    const { size = 14, width = size, height = size, fill = '' } = props;
    return (
      <svg viewBox="0 0 512 512" width={ `${ width }px` } height={ `${ height }px` } ><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"/></svg>
  );
}

export default Circle;
