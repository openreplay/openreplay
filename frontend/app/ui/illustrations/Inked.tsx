import type { CSSProperties, ReactNode } from 'react';

import { FRAMES, type P, rng } from './ink';

export type Move =
  | 'bob'
  | 'swing'
  | 'pulse'
  | 'ring'
  | 'scan'
  | 'wave'
  | 'spin'
  | 'blink'
  | 'rise'
  | 'tilt'
  | 'plugIn'
  | 'connect'
  | 'scrub';

export interface Layer {
  fill?: ReactNode;
  line: (r: () => number) => ReactNode;
  move?: Move;
  origin?: P;
}

export type Drawing = Layer[];

export function Inked({
  drawing,
  rough,
  hand,
}: {
  drawing: Drawing;
  rough: (k: number) => string;
  hand: number;
}) {
  return (
    <>
      {drawing.map((layer, i) => {
        const body = (
          <>
            {layer.fill}
            {FRAMES.map((k) => (
              <g key={k} className={`m-ill__frame m-ill__frame--${k}`}>
                <g filter={rough(k)} className="m-ill__line">
                  {layer.line(rng(hand * 131 + i * 53 + k * 17 + 5))}
                </g>
              </g>
            ))}
          </>
        );
        if (!layer.move) return <g key={i}>{body}</g>;
        const o = layer.origin ?? [0, 0];
        return (
          <g
            key={i}
            className={`m-ill__move m-ill__move--${layer.move}`}
            style={{ transformOrigin: `${o[0]}px ${o[1]}px` } as CSSProperties}
          >
            {body}
          </g>
        );
      })}
    </>
  );
}
