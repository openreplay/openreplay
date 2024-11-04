
/* Auto-generated, do not edit */
import React from 'react';

interface Props {
    size?: number | string;
    width?: number | string;
    height?: number | string;
    fill?: string;
}

function Cross(props: Props) {
    const { size = 14, width = size, height = size, fill = '' } = props;
    return (
      <svg viewBox="0 0 16 16" width={ `${ width }px` } height={ `${ height }px` } ><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
  );
}

export default Cross;
