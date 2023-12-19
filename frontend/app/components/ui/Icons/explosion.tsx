
/* Auto-generated, do not edit */
import React from 'react';

interface Props {
    size?: number | string;
    width?: number | string;
    height?: number | string;
    fill?: string;
}

function Explosion(props: Props) {
    const { size = 14, width = size, height = size, fill = '' } = props;
    return (
      <svg viewBox="0 0 16 16" width={ `${ width }px` } height={ `${ height }px` } ><path d="M0 10.5a.5.5 0 0 1 .5-.5h15a.5.5 0 0 1 0 1H.5a.5.5 0 0 1-.5-.5zM12 0H4a2 2 0 0 0-2 2v7h1V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v7h1V2a2 2 0 0 0-2-2zm2 12h-1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2H2v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2z"/></svg>
  );
}

export default Explosion;
