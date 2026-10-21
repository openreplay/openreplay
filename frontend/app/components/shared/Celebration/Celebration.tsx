import { SessionAvatar } from '@/ui/data/SessionAvatar';
import type { AvatarFace } from '@/ui/data/avatar';
import {
  FRAMES,
  type P,
  f,
  inked,
  poly,
  ring,
  rng,
} from '@/ui/illustrations/ink';
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react';

import './celebration.css';

export type CelebrationVariant = 'install' | 'ready';

export interface CelebrationProps {
  variant?: CelebrationVariant;
  size?: number;
  className?: string;
}

const ARRIVAL_MS = 1500;

export function Celebration({
  variant = 'install',
  size = 184,
  className,
}: CelebrationProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [arriving, setArriving] = useState(true);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setArriving(false), ARRIVAL_MS);
    return () => window.clearTimeout(t);
  }, []);
  const cheering = arriving || hovered;
  const rough = (k: number) => `url(#cb-rough-${uid}-${k})`;
  const art = useMemo(
    () =>
      variant === 'install' ? (
        <Install rough={rough} />
      ) : (
        <Ready rough={rough} />
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [variant, uid],
  );

  return (
    <span
      className={`m-cheer m-cheer--${variant}${cheering ? ' is-cheering' : ''}${className ? ` ${className}` : ''}`}
      style={{ width: size, height: Math.round((size * 112) / 200) }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 112" className="m-cheer__svg" fill="none">
        <defs>
          {FRAMES.map((k) => (
            <filter
              key={k}
              id={`cb-rough-${uid}-${k}`}
              x="-5%"
              y="-5%"
              width="110%"
              height="110%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves="2"
                seed={3 + k * 11}
                result="n"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="n"
                scale="1.6"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
        </defs>
        {art}
      </svg>
    </span>
  );
}

type Rough = (k: number) => string;

function Boil({ children }: { children: (k: number) => ReactNode }) {
  return (
    <>
      {FRAMES.map((k) => (
        <g key={k} className={`m-cheer__frame m-cheer__frame--${k}`}>
          {children(k)}
        </g>
      ))}
    </>
  );
}

const W = 44;
const H = 42;
const DX = 12;
const DY = 9;
const TOP = 52;
const FACE = 38;

export interface RobotFace {
  seed: string;
  drift: NonNullable<AvatarFace['mouth']>;
}

function Robot({
  x,
  hand,
  face,
  lean,
  rough,
  hop,
}: {
  x: number;
  hand: number;
  face: RobotFace;
  lean: 1 | -1;
  rough: Rough;
  hop: 'a' | 'b';
}) {
  const B = TOP + H;
  const front: P[] = [
    [x, TOP],
    [x + W, TOP],
    [x + W, B],
    [x, B],
  ];
  const top: P[] = [
    [x, TOP],
    [x + DX, TOP - DY],
    [x + W + DX, TOP - DY],
    [x + W, TOP],
  ];
  const side: P[] = [
    [x + W, TOP],
    [x + W + DX, TOP - DY],
    [x + W + DX, B - DY],
    [x + W, B],
  ];
  const silhouette: P[] = [
    [x, TOP],
    [x + DX, TOP - DY],
    [x + W + DX, TOP - DY],
    [x + W + DX, B - DY],
    [x + W, B],
    [x, B],
  ];
  const foot = (fx: number): P[] => [
    [fx, B - 1],
    [fx + 10, B - 1],
    [fx + 10.5, B + 5],
    [fx + 8.5, B + 7.5],
    [fx + 1.5, B + 7.5],
    [fx - 0.5, B + 5],
  ];
  const feet = [foot(x + 7), foot(x + 27)];
  const cx = x + (W + DX) / 2;
  const cy = TOP - DY / 2;
  const antenna: P[] = [
    [cx, cy],
    [cx + 4 * lean, cy - 8.5],
    [cx + 8 * lean, cy - 16],
  ];
  const bobble: P = [cx + 9.5 * lean, cy - 19.5];

  const faces: { kind: string; part?: AvatarFace }[] = [
    { kind: 'own' },
    { kind: 'drift', part: { mouth: face.drift } },
    { kind: 'blink', part: { eyes: 'soft' } },
    { kind: 'cheer', part: { eyes: 'happy', mouth: 'open' } },
  ];

  return (
    <g
      className={`m-cheer__bot m-cheer__bot--${hop}`}
      style={{ transformOrigin: `${cx}px ${B + 7.5}px` }}
    >
      <ellipse
        cx={cx}
        cy={B + 9}
        rx={31}
        ry={3.2}
        className="m-cheer__ground"
      />
      {feet.map((p, i) => (
        <path key={i} d={poly(p)} className="m-cheer__fill-side" />
      ))}
      <path d={poly(top)} className="m-cheer__fill-top" />
      <path d={poly(front)} className="m-cheer__fill-front" />
      <path d={poly(side)} className="m-cheer__fill-side" />
      {faces.map(({ kind, part }) => (
        <foreignObject
          key={kind}
          x={x + (W - FACE) / 2}
          y={TOP + (H - FACE) / 2}
          width={FACE}
          height={FACE}
          className={`m-cheer__face m-cheer__face--${kind}`}
        >
          <SessionAvatar seed={face.seed} face={part} size={FACE} faceOnly />
        </foreignObject>
      ))}

      <Boil>
        {(k) => {
          const r = rng(hand * 97 + k * 13 + 1);
          return (
            <g filter={rough(k)} className="m-cheer__line">
              {feet.map((p, i) => (
                <path key={i} d={inked(p, true, r, 0.45)} />
              ))}
              <path d={inked(silhouette, true, r)} />
              <path
                d={inked(
                  [
                    [x, TOP],
                    [x + W, TOP],
                    [x + W + DX, TOP - DY],
                  ],
                  false,
                  r,
                  0.6,
                )}
              />
              <path
                d={inked(
                  [
                    [x + W, TOP],
                    [x + W, B],
                  ],
                  false,
                  r,
                  0.6,
                )}
              />
              <path d={inked(antenna, false, r, 0.5)} />
              <path
                d={ring(bobble[0], bobble[1], 4, r)}
                className="m-cheer__bobble"
              />
            </g>
          );
        }}
      </Boil>
    </g>
  );
}

type Bit = {
  kind: 'spark' | 'squig' | 'dash' | 'ring';
  x: number;
  y: number;
  s?: number;
  a?: number;
};

function Piece({
  bit,
  from,
  i,
  rough,
}: {
  bit: Bit;
  from: P;
  i: number;
  rough: Rough;
}) {
  const r = rng(i * 31 + 7);
  const { x, y } = bit;
  const s = bit.s ?? 4;
  let d: string;
  let cls = 'm-cheer__line';
  if (bit.kind === 'spark') {
    const k = s * 0.3;
    d = inked(
      [
        [x, y - s],
        [x + k, y - k],
        [x + s, y],
        [x + k, y + k],
        [x, y + s],
        [x - k, y + k],
        [x - s, y],
        [x - k, y - k],
      ],
      true,
      r,
      0.25,
    );
    cls = 'm-cheer__line m-cheer__spark';
  } else if (bit.kind === 'squig') {
    d = inked(
      [
        [x - 5, y + 1.5],
        [x - 2, y - 1.5],
        [x + 1, y + 1.5],
        [x + 4, y - 1.5],
      ],
      false,
      r,
      0.35,
    );
  } else if (bit.kind === 'dash') {
    const a = ((bit.a ?? 0) * Math.PI) / 180;
    d = inked(
      [
        [x - Math.cos(a) * 2.6, y - Math.sin(a) * 2.6],
        [x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6],
      ],
      false,
      r,
      0.3,
    );
  } else {
    d = ring(x, y, s, r, 0.3);
  }
  const style = {
    transformOrigin: `${x}px ${y}px`,
    '--dx': `${f(from[0] - x)}px`,
    '--dy': `${f(from[1] - y)}px`,
    '--i': i,
  } as CSSProperties;
  return (
    <g className="m-cheer__bit" style={style}>
      <path d={d} className={cls} filter={rough(0)} />
    </g>
  );
}

function Confetti({
  bits,
  from,
  rough,
}: {
  bits: Bit[];
  from: P;
  rough: Rough;
}) {
  return (
    <g className="m-cheer__confetti">
      {bits.map((b, i) => (
        <Piece key={i} bit={b} from={from} i={i} rough={rough} />
      ))}
    </g>
  );
}

const INSTALL_BITS: Bit[] = [
  { kind: 'spark', x: 99, y: 15, s: 5.5 },
  { kind: 'squig', x: 84, y: 24 },
  { kind: 'squig', x: 115, y: 24 },
  { kind: 'dash', x: 88, y: 8, a: 55 },
  { kind: 'dash', x: 110, y: 8, a: -55 },
  { kind: 'ring', x: 76, y: 12, s: 2.2 },
  { kind: 'ring', x: 123, y: 13, s: 2.2 },
  { kind: 'spark', x: 66, y: 8, s: 3 },
  { kind: 'spark', x: 133, y: 7, s: 3 },
  { kind: 'dash', x: 16, y: 38, a: 40 },
  { kind: 'dash', x: 185, y: 36, a: -40 },
];

function Install({ rough }: { rough: Rough }) {
  return (
    <>
      <Robot
        x={28}
        hand={1}
        face={{ seed: 'armada-a', drift: 'smile' }}
        lean={1}
        rough={rough}
        hop="a"
      />
      <Robot
        x={116}
        hand={2}
        face={{ seed: 'armada-c', drift: 'bigSmile' }}
        lean={-1}
        rough={rough}
        hop="b"
      />
      <Confetti bits={INSTALL_BITS} from={[99, 32]} rough={rough} />
    </>
  );
}

const READY_BITS: Bit[] = [
  { kind: 'spark', x: 96, y: 18, s: 5.5 },
  { kind: 'squig', x: 82, y: 28 },
  { kind: 'dash', x: 108, y: 30, a: -50 },
  { kind: 'ring', x: 70, y: 12, s: 2.2 },
  { kind: 'spark', x: 110, y: 9, s: 3 },
  { kind: 'spark', x: 182, y: 36, s: 3 },
  { kind: 'dash', x: 172, y: 30, a: -40 },
  { kind: 'ring', x: 14, y: 40, s: 2 },
];

function Ready({ rough }: { rough: Rough }) {
  const card: P[] = [
    [112, 50],
    [115, 46],
    [176, 46],
    [179, 50],
    [179, 94],
    [176, 98],
    [115, 98],
    [112, 94],
  ];
  const play: P[] = [
    [141, 60],
    [141, 74],
    [153, 67],
  ];
  return (
    <>
      <g className="m-cheer__card">
        <ellipse
          cx={146}
          cy={103}
          rx={38}
          ry={3.2}
          className="m-cheer__ground"
        />
        <path
          d={poly(card.map(([x, y]) => [x + 3.5, y + 3.5] as P))}
          className="m-cheer__fill-side"
        />
        <path d={poly(card)} className="m-cheer__fill-top" />
        <path d={poly(play)} className="m-cheer__fill-accent" />
        <Boil>
          {(k) => {
            const r = rng(500 + k * 13);
            return (
              <g filter={rough(k)} className="m-cheer__line">
                <path d={inked(card, true, r, 0.6)} />
                <path d={inked(play, true, r, 0.4)} />
                <path
                  d={inked(
                    [
                      [122, 86],
                      [170, 86],
                    ],
                    false,
                    r,
                    0.5,
                  )}
                />
                <path
                  d={ring(136, 86, 2.6, r, 0.3)}
                  className="m-cheer__bobble"
                />
              </g>
            );
          }}
        </Boil>
      </g>
      <Robot
        x={30}
        hand={3}
        face={{ seed: 'armada-b', drift: 'smile' }}
        lean={1}
        rough={rough}
        hop="a"
      />
      <Confetti bits={READY_BITS} from={[98, 38]} rough={rough} />
    </>
  );
}
