import type { MarkedTarget } from 'Player';
import React from 'react';

import './marker.css';

/** A count dot on the clicked element's corner, sized by its clicks. */
export default function Marker({
  target,
  hot,
}: {
  target: MarkedTarget;
  hot: boolean;
}) {
  const { top, left, width, height } = target.boundingRect;
  return (
    <div className="m-wf__heat-box" style={{ top, left, width, height }}>
      <span
        className={`m-wf__heat${hot ? ' is-hot' : ''}`}
        style={{ ['--n' as string]: Math.min(target.count, 12) }}
        aria-hidden="true"
      >
        {target.count}
      </span>
    </div>
  );
}
