import type { RefObject } from 'react';

import { useTorch } from './useTorch';

export function TorchRing() {
  const torch = useTorch(true);
  return (
    <span
      className="m-fbar__ring"
      ref={torch as RefObject<HTMLSpanElement>}
      aria-hidden="true"
    >
      <svg>
        <rect
          className="m-fbar__glow"
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="4"
        />
        <rect
          className="m-fbar__arc"
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="4"
        />
      </svg>
    </span>
  );
}
