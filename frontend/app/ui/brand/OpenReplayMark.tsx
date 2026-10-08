import { type CSSProperties, useId } from 'react';

import {
  OR_FILL_SCALE,
  OR_FILL_SHIFT,
  OR_HOLE,
  OR_INNER,
  OR_INNER_ORIGIN,
  OR_OUTER,
  OR_OUTLINE,
  OR_VIEWBOX,
} from './openreplay-mark';
import './openreplay-mark.css';

export interface OpenReplayMarkProps {
  size?: number;
  className?: string;

  variant?: 'brand' | 'plain';

  filled?: boolean;
}

export function OpenReplayMark({
  size = 17,
  className,
  variant = 'brand',
  filled,
}: OpenReplayMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clip = `or-hole-${uid}`;
  const mask = `or-cut-${uid}`;

  if (variant === 'plain') {
    return (
      <svg
        className={`m-ormark is-plain${filled ? ' is-filled' : ''}${className ? ` ${className}` : ''}`}
        viewBox={OR_VIEWBOX}
        height={size}
        width={(size * 52) / 59}
        aria-hidden="true"
      >
        <path
          d={OR_OUTER}
          fill="none"
          stroke="currentColor"
          strokeWidth={3.8}
          strokeLinejoin="round"
        />

        <path
          className="m-ormark__inner"
          d={OR_INNER}
          stroke="currentColor"
          strokeWidth={3.8}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className={`m-ormark${className ? ` ${className}` : ''}`}
      viewBox={OR_VIEWBOX}
      height={size}
      width={(size * 52) / 59}
      style={
        {
          '--m-ormark-origin': OR_INNER_ORIGIN,
          '--m-ormark-shift': `${OR_FILL_SHIFT}px`,
          '--m-ormark-scale': OR_FILL_SCALE,
        } as CSSProperties
      }
      role="img"
      aria-label="OpenReplay"
    >
      <defs>
        <clipPath id={clip}>
          <path d={OR_HOLE} />
        </clipPath>

        <mask
          id={mask}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="52"
          height="59"
        >
          <rect x="0" y="0" width="52" height="59" fill="#fff" />
          <path className="m-ormark__eye" d={OR_INNER} fill="#000" />
        </mask>
      </defs>

      <path className="m-ormark__outline" d={OR_OUTLINE} fillRule="nonzero" />

      <g clipPath={`url(#${clip})`}>
        <g mask={`url(#${mask})`}>
          <path className="m-ormark__fill" d={OR_INNER} />
        </g>
      </g>
    </svg>
  );
}
