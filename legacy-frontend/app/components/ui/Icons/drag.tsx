
/* Auto-generated, do not edit */
import React from 'react';

interface Props {
    size?: number | string;
    width?: number | string;
    height?: number | string;
    fill?: string;
}

function Drag(props: Props) {
    const { size = 14, width = size, height = size, fill = '' } = props;
    return (
      <svg viewBox="0 0 26 26" width={ `${ width }px` } height={ `${ height }px` } ><path d="M13 0 9 4h8ZM0 7v2h26V7Zm0 5v2h26v-2Zm0 5v2h26v-2Zm9 5 4 4 4-4Z"/></svg>
  );
}

export default Drag;
