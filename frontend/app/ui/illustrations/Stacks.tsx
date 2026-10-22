import { useId, useState } from 'react';

import { Bot, type BotShape, FOOT, TURNED, proj3 } from './Bot';
import { type Drawing, Inked } from './Inked';
import './illustration.css';
import { FRAMES, type P, PAPER, inked, poly, rng } from './ink';
import './stacks.css';

const W = 400;
const H = 216;

const BRICK = { w: 48, h: 15, depth: 44 };

function brick(x: number, y: number, z: number): Drawing[number] {
  const { w, h, depth } = BRICK;
  const q = (X: number, Y: number, Z: number): P => {
    const [px, py] = proj3(TURNED, depth, X, Y, Z + z);
    return [px + x, py + y];
  };
  const top: P[] = [q(0, 0, 0), q(0, 0, 1), q(w, 0, 1), q(w, 0, 0)];
  const side: P[] = [q(0, 0, 0), q(0, 0, 1), q(0, h, 1), q(0, h, 0)];
  const front: P[] = [q(0, 0, 0), q(w, 0, 0), q(w, h, 0), q(0, h, 0)];
  const outline: P[] = [
    q(w, 0, 0),
    q(w, 0, 1),
    q(0, 0, 1),
    q(0, h, 1),
    q(0, h, 0),
    q(w, h, 0),
  ];
  const topEdge: P[] = [q(w, 0, 0), q(0, 0, 0), q(0, 0, 1)];
  const frontEdge: P[] = [q(0, 0, 0), q(0, h, 0)];
  return {
    fill: (
      <>
        <path d={poly(top)} className="m-ill__fill-top" />
        <path d={poly(side)} className="m-ill__fill-side" />
        <path d={poly(front)} className={PAPER} />
      </>
    ),
    line: (r) => (
      <>
        <path d={inked(outline, true, r, 0.55)} />
        <path d={inked(topEdge, false, r, 0.5)} />
        <path d={inked(frontEdge, false, r, 0.5)} />
      </>
    ),
  };
}

function pile(
  x: number,
  ground: number,
  n: number,
  seed: number,
): { drawing: Drawing; top: [number, number]; z: number } {
  const r = rng(seed);
  const drawing: Drawing = [];
  let bx = x;
  let bz = 0;
  for (let i = 0; i < n; i++) {
    bx = x + (r() * 2 - 1) * 5;
    bz = (r() * 2 - 1) * 0.12;
    drawing.push(brick(bx, ground - (i + 1) * BRICK.h, bz));
  }
  return { drawing, top: [bx, ground - n * BRICK.h], z: bz };
}

function castShadow(
  x: number,
  ground: number,
  n: number,
  shape: BotShape,
): { pile: P[]; agent: P[]; base: P } {
  const q = (X: number, L: number): P => {
    const [px, py] = proj3(TURNED, BRICK.depth, X, 0, L / BRICK.depth);
    return [px + x, py + ground];
  };
  const tower = BRICK.depth + n * BRICK.h * 0.8;
  const cx = BRICK.w / 2;
  let agent: P[];
  if (shape === 'sphere') {
    const r = 25 * SIT;
    const rl = r * 0.8;
    agent = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      return q(cx + Math.cos(a) * r, tower + rl + Math.sin(a) * rl);
    });
  } else if (shape === 'triangle') {
    const half = 22 * TURNED.ax * SIT;
    agent = [
      q(cx - half, tower - 2),
      q(cx + half, tower - 2),
      q(cx, tower + 56 * SIT * 0.8),
    ];
  } else {
    const half = 22 * SIT;
    agent = [
      q(cx - half, tower - 2),
      q(cx - half, tower + 42 * SIT * 0.8),
      q(cx + half, tower + 42 * SIT * 0.8),
      q(cx + half, tower - 2),
    ];
  }
  return {
    pile: [q(0, 0), q(0, tower), q(BRICK.w, tower), q(BRICK.w, 0)],
    agent,
    base: q(cx, tower),
  };
}

const sitGround = (top: number, s: number) => top + (FOOT - 42 * TURNED.cy) * s;

export interface StacksProps {
  className?: string;
  silly?: boolean;
}

const PILES: {
  x: number;
  n: number;
  seed: number;
  shape: BotShape;
  lean: 1 | -1;
}[] = [
  { x: 48, n: 5, seed: 31, shape: 'cube', lean: 1 },
  { x: 168, n: 3, seed: 47, shape: 'sphere', lean: 1 },
  { x: 290, n: 9, seed: 59, shape: 'triangle', lean: 1 },
];
const GROUND = 206;
const SIT = 0.9;

export function Stacks({ className, silly }: StacksProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hovered, setHovered] = useState(false);
  const on = silly ?? hovered;
  const rough = (k: number) => `url(#stacks-rough-${uid}-${k})`;

  return (
    <span
      className={`m-ill m-ill--page m-stacks${on ? ' is-silly' : ''}${className ? ` ${className}` : ''}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="m-ill__svg" fill="none">
        <defs>
          {FRAMES.map((k) => (
            <filter
              key={k}
              id={`stacks-rough-${uid}-${k}`}
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
        {PILES.map((p, i) => {
          const sh = castShadow(p.x, GROUND, p.n, p.shape);
          return (
            <g key={`sh-${i}`}>
              <path d={poly(sh.pile)} className="m-ill__ground" />
              <g
                className={`m-stacks__shade m-stacks__shade--${i}`}
                style={{
                  transformOrigin: `${sh.base[0].toFixed(1)}px ${sh.base[1].toFixed(1)}px`,
                }}
              >
                <path d={poly(sh.agent)} className="m-ill__ground" />
              </g>
            </g>
          );
        })}
        {PILES.map((p, i) => {
          const { drawing, top, z } = pile(p.x, GROUND, p.n, p.seed);
          const back =
            p.shape === 'sphere'
              ? 0.5
              : (BRICK.depth - 36 * SIT) / 2 / BRICK.depth;
          const [ox, oy] = proj3(TURNED, BRICK.depth, 0, 0, z + back);
          const mid = p.shape === 'sphere' ? 28 * SIT : 22 * TURNED.ax * SIT;
          const bx = top[0] + ox + (BRICK.w * TURNED.ax) / 2 - mid;
          return (
            <g key={i} className="m-stacks__pile">
              <Inked drawing={drawing} rough={rough} hand={11 + i} />
              <g className={`m-stacks__sit m-stacks__sit--${i}`}>
                <Bot
                  x={bx}
                  ground={sitGround(top[1] + oy, SIT)}
                  scale={SIT}
                  shape={p.shape}
                  lean={p.lean}
                  hand={2 + i}
                  rough={rough}
                  shadow={false}
                  beat={i % 2 ? 'b' : 'a'}
                  view="turned"
                  feet={false}
                />
              </g>
            </g>
          );
        })}
      </svg>
    </span>
  );
}
