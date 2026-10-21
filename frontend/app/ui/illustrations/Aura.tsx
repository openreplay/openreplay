import type { CSSProperties } from 'react';

import { FRAMES, type P, inked, ring, rng } from './ink';

export type AuraKind =
  | 'curious'
  | 'zzz'
  | 'waves'
  | 'confetti'
  | 'sparks'
  | 'ticks';

export interface AuraProps {
  kind?: AuraKind;
  head: P;
  facing: number;
  radius: number;
  unit: number;
  seed: number;
  rough: (k: number) => string;
}

const at = (o: P, deg: number, rad: number): P => [
  o[0] + Math.cos((deg * Math.PI) / 180) * rad,
  o[1] + Math.sin((deg * Math.PI) / 180) * rad,
];
const f = (n: number) => n.toFixed(2);

type Shape = 'q' | 'plus' | 'sparkle' | 'ring' | 'dot' | 'z' | 'arc' | 'tick';
type Mark = {
  shape: Shape;
  p: P;
  s: number;
  arc?: { rad: number; span: number };
};

function draw(m: Mark, head: P, facing: number, r: () => number): string {
  const [x, y] = m.p;
  const s = m.s;
  switch (m.shape) {
    case 'q': {
      const a = s * 1.15;
      return inked(
        [
          [x - a * 0.85, y - a * 0.55],
          [x - a * 0.25, y - a * 1.3],
          [x + a * 0.7, y - a * 0.95],
          [x + a * 0.65, y - a * 0.1],
          [x, y + a * 0.3],
          [x, y + a * 0.75],
        ],
        false,
        r,
        0.14,
      );
    }
    case 'plus':
      return `${inked(
        [
          [x - s, y],
          [x + s, y],
        ],
        false,
        r,
        0.12,
      )} ${inked(
        [
          [x, y - s],
          [x, y + s],
        ],
        false,
        r,
        0.12,
      )}`;
    case 'sparkle': {
      const a = s * 1.35;
      const q = s * 0.28;
      return inked(
        [
          [x, y - a],
          [x + q, y - q],
          [x + a, y],
          [x + q, y + q],
          [x, y + a],
          [x - q, y + q],
          [x - a, y],
          [x - q, y - q],
        ],
        true,
        r,
        0.1,
      );
    }
    case 'ring':
      return ring(x, y, s * 0.7, r, 0.1);
    case 'z': {
      const w = s;
      const h = s * 0.92;
      return inked(
        [
          [x - w, y - h],
          [x + w, y - h],
          [x - w, y + h],
          [x + w, y + h],
        ],
        false,
        r,
        0.1,
      );
    }
    case 'arc': {
      const { rad, span } = m.arc!;
      return inked(
        [-3, -2, -1, 0, 1, 2, 3].map((k) =>
          at(head, facing + (k * span) / 6, rad),
        ),
        false,
        r,
        0.1,
      );
    }
    default:
      return '';
  }
}

function marks(
  kind: AuraKind,
  head: P,
  facing: number,
  radius: number,
  unit: number,
): Mark[] {
  const around = (shapes: Shape[], spread: number, sizes?: number[]): Mark[] =>
    shapes.map((shape, i) => {
      const deg =
        facing -
        spread / 2 +
        (shapes.length === 1 ? spread / 2 : (spread * i) / (shapes.length - 1));
      return {
        shape,
        p: at(head, deg, radius * (i % 2 ? 1.12 : 1)),
        s: unit * (sizes?.[i] ?? 1),
      };
    });
  if (kind === 'curious')
    return around(['plus', 'q', 'sparkle'], 110, [0.8, 1.05, 0.95]);
  if (kind === 'confetti')
    return around(
      ['sparkle', 'plus', 'dot', 'ring', 'sparkle'],
      140,
      [1, 0.8, 0.6, 0.85, 0.8],
    );
  if (kind === 'sparks')
    return around(['plus', 'sparkle', 'plus'], 110, [0.7, 1, 0.6]);
  if (kind === 'waves')
    return [0, 1, 2].map((i) => ({
      shape: 'arc' as Shape,
      p: head,
      s: unit,
      arc: { rad: radius * ((i + 1) / 3), span: 56 + i * 12 },
    }));
  if (kind === 'ticks')
    return [0, 1, 2].map((i) => ({
      shape: 'tick' as Shape,
      p: [head[0] + (i - 1) * unit * 2.4, head[1]] as P,
      s: unit,
    }));
  return [0, 1, 2].map((i) => {
    const base = at(head, facing, radius * i);
    const side = i === 1 ? 0.35 : 0;
    return {
      shape: 'z' as Shape,
      p: at(base, facing + 90, radius * side),
      s: unit * (1 + i * 0.38),
    };
  });
}

export function Aura({
  kind = 'curious',
  head,
  facing,
  radius,
  unit,
  seed,
  rough,
}: AuraProps) {
  return (
    <g className={`m-ill__aura m-ill__aura--${kind}`}>
      {marks(kind, head, facing, radius, unit).map((m, i) => {
        const [x, y] = m.p;
        const style = {
          transformOrigin:
            m.shape === 'arc'
              ? `${f(head[0])}px ${f(head[1])}px`
              : `${f(x)}px ${f(y)}px`,
          '--i': i,
          '--from-x': `${f(head[0] - x)}px`,
          '--from-y': `${f(head[1] - y)}px`,
        } as CSSProperties;
        const solid = m.shape === 'dot' || m.shape === 'tick';
        return (
          <g key={i} className="m-ill__aura-mark" style={style}>
            <g
              className="m-ill__aura-wig"
              style={{ transformOrigin: style.transformOrigin }}
            >
              {solid ? (
                <circle
                  cx={x}
                  cy={y}
                  r={m.s * (m.shape === 'dot' ? 0.6 : 0.55)}
                  className={
                    m.shape === 'dot'
                      ? 'm-ill__fill-accent-soft'
                      : 'm-ill__aura-dot'
                  }
                />
              ) : (
                FRAMES.map((k) => (
                  <g key={k} className={`m-ill__frame m-ill__frame--${k}`}>
                    <path
                      d={draw(m, head, facing, rng(seed + i * 31 + k * 7))}
                      className={`m-ill__aura-line${m.shape === 'z' || m.shape === 'arc' ? ' is-bold' : ''}`}
                      filter={rough(k)}
                    />
                  </g>
                ))
              )}
              {m.shape === 'q' && (
                <circle
                  cx={x}
                  cy={y + m.s * 1.55}
                  r={m.s * 0.22}
                  className="m-ill__aura-dot"
                />
              )}
            </g>
          </g>
        );
      })}
    </g>
  );
}
