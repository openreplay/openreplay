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
  /** brand only: the loading state, a light crossing the mark (see Loader) */
  loop?: boolean;
}

export function OpenReplayMark({
  size = 17,
  className,
  variant = 'brand',
  filled,
  loop,
}: OpenReplayMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clip = `or-hole-${uid}`;
  const mask = `or-cut-${uid}`;
  const shape = `or-shape-${uid}`;
  const sheen = `or-sheen-${uid}`;

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
      className={`m-ormark${loop ? ' is-looping' : ''}${className ? ` ${className}` : ''}`}
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
      // a loader is named by its caption; the logo in the nav names itself
      role={loop ? undefined : 'img'}
      aria-label={loop ? undefined : 'OpenReplay'}
      aria-hidden={loop ? true : undefined}
    >
      <defs>
        {loop ? (
          <>
            {/* the painted logo only, so the light crosses it as one object
                and never lights the gap between the two triangles */}
            <clipPath id={shape}>
              <path d={OR_OUTLINE} clipRule="nonzero" />
              <path d={OR_INNER} />
            </clipPath>
            <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.62" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </>
        ) : null}
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

      {loop ? (
        <g clipPath={`url(#${shape})`}>
          {/* the wrapper travels, the band inside keeps its slant */}
          <g className="m-ormark__sheen">
            <rect
              x="-30"
              y="-6"
              width="26"
              height="71"
              fill={`url(#${sheen})`}
              transform="skewX(-18)"
            />
          </g>
        </g>
      ) : null}
    </svg>
  );
}
