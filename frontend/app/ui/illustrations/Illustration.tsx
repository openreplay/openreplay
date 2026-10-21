import type { AvatarFace } from '@/ui/data/avatar';
import {
  type CSSProperties,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { Aura, type AuraKind } from './Aura';
import {
  BOT_W,
  Bot,
  type BotShape,
  FOOT,
  HELD,
  TOP_Y,
  bobbleOf,
  slotPlace,
} from './Bot';
import { Inked } from './Inked';
import './illustration.css';
import { FRAMES, inked, rng } from './ink';
import { PROPS, type PropDef, type PropKind } from './props';
import { SUBJECTS, type SubjectDef, type SubjectKind } from './subjects';

export type IllustrationSize = 'page' | 'compact';
export type Peek = 'left' | 'right' | 'top';

export type Pose =
  | 'peek'
  | 'stand'
  | 'wait'
  | 'work'
  | 'cheer'
  | 'sit'
  | 'sleep';

const POSES: Record<
  Pose,
  {
    place: 'behind' | 'beside' | 'top';
    face: AvatarFace;
    rest?: AvatarFace;
    aura: AuraKind;
  }
> = {
  peek: {
    place: 'behind',
    face: { eyes: 'wide', mouth: 'tiny' },
    aura: 'curious',
  },
  stand: {
    place: 'beside',
    face: { eyes: 'round', mouth: 'smile' },
    aura: 'curious',
  },
  wait: {
    place: 'beside',
    face: { eyes: 'slim', mouth: 'flat' },
    aura: 'ticks',
  },
  work: {
    place: 'beside',
    face: { eyes: 'happy', mouth: 'smile' },
    aura: 'sparks',
  },
  cheer: {
    place: 'beside',
    face: { eyes: 'happy', mouth: 'open' },
    aura: 'confetti',
  },
  sit: {
    place: 'top',
    face: { eyes: 'round', mouth: 'bigSmile' },
    aura: 'waves',
  },
  sleep: {
    place: 'top',
    rest: { eyes: 'soft', mouth: 'flat' },
    face: { eyes: 'wide', mouth: 'open' },
    aura: 'zzz',
  },
};

export interface IllustrationProps {
  subject: SubjectKind | null;
  robot?: boolean;
  shape?: BotShape;
  peek?: Peek;
  pose?: Pose;
  side?: 'left' | 'right';
  prop?: PropKind | null;
  aura?: boolean | AuraKind;
  size?: IllustrationSize;
  width?: number;
  active?: boolean;
  seed?: string;
  variant?: string;
  className?: string;
}

const BOX = { page: [200, 112], compact: [120, 72] } as const;

const HAS: Partial<Record<string, PropKind[]>> = {
  sessions: ['play'],
  sessionsInstall: ['plug'],
  sessionsArriving: ['play'],
  sessionsQuiet: [],
  sessionsPaused: [],
  sessionsMobile: ['play'],
  listening: ['play', 'stopwatch'],
  bookmarks: ['bookmark'],
  noMatch: ['magnifier'],
  segments: ['bookmark'],
  cobrowse: ['cursor'],
  recordedVideos: ['camera', 'play'],
  spot: ['camera', 'puzzle'],
  calendar: ['calendar'],
  issues: ['flag'],
  critical: ['star'],
  tests: ['clipboard'],
  runs: ['stopwatch'],
  environments: ['plug'],
  audits: ['clipboard', 'magnifier'],
  dashboards: ['chart'],
  dashboardEmpty: ['chart'],
  cards: ['chart'],
  chart: ['chart', 'calendar'],
  calendarWait: ['calendar', 'stopwatch'],
  alerts: ['bell', 'chart'],
  activity: ['cursor'],
  events: ['tag'],
  properties: ['tag'],
  features: ['cursor', 'tag'],
  exports: ['box', 'play'],
  keys: ['key'],
  webhooks: ['plug'],
  invoices: ['calendar'],
  tags: ['tag'],
};

const SHAPES: BotShape[] = ['cube', 'sphere', 'triangle'];
const PEEKS: Peek[] = ['right', 'top', 'left'];
export const hash = (s: string) =>
  [...s].reduce(
    (h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0,
    2166136261,
  );
export const pickShape = (variant: string): BotShape =>
  SHAPES[hash(variant) % 3]!;
export const pickPeek = (variant: string): Peek =>
  PEEKS[(hash(variant) >>> 7) % 3]!;

type Rect = { x: number; y: number; w: number; h: number };
function mainBody(g: SVGGElement | null): Rect | null {
  if (!g) return null;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  g.querySelectorAll<SVGGraphicsElement>(
    'path.m-ill__fill-paper, path.m-ill__fill-side, path.m-ill__fill-top, path.m-ill__fill-front',
  ).forEach((el) => {
    const b = el.getBBox();
    if (b.width * b.height < 60) return;
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width);
    y1 = Math.max(y1, b.y + b.height);
  });
  return x1 > x0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

const FACE_MID: Record<BotShape, number> = {
  cube: 21,
  sphere: 19,
  triangle: 29,
};

function botAura(
  kind: AuraKind,
  shape: BotShape,
  lean: 1 | -1,
  out: -1 | 0 | 1,
  scale: number,
  size: IllustrationSize,
  seed: number,
  rough: (k: number) => string,
  holding = false,
) {
  const unit = (size === 'page' ? 2.8 : 3.2) / scale;
  const head: [number, number] = [28, FACE_MID[shape]];
  const up = -90 + out * 40 + (holding ? (out || lean) * 40 : 0);
  const px = 1 / scale;
  if (kind === 'waves')
    return (
      <Aura
        kind="waves"
        head={bobbleOf(shape, lean)}
        facing={-90 + lean * 18}
        radius={(size === 'page' ? 16 : 13) * px}
        unit={unit}
        seed={seed}
        rough={rough}
      />
    );
  if (kind === 'zzz') {
    const dir = out || 1;
    return (
      <Aura
        kind="zzz"
        head={[28 + dir * 34, FACE_MID[shape] - 30]}
        facing={-90 + dir * 38}
        radius={(size === 'page' ? 14 : 11) * px}
        unit={unit * 1.1}
        seed={seed}
        rough={rough}
      />
    );
  }
  if (kind === 'ticks')
    return (
      <Aura
        kind="ticks"
        head={[out === -1 ? -26 : 82, FACE_MID[shape] - 10]}
        facing={-90}
        radius={10}
        unit={unit}
        seed={seed}
        rough={rough}
      />
    );
  if (kind === 'sparks')
    return (
      <Aura
        kind="sparks"
        head={[out === -1 ? 66 : -10, 26]}
        facing={out === -1 ? -40 : -140}
        radius={22}
        unit={unit}
        seed={seed}
        rough={rough}
      />
    );
  return (
    <Aura
      kind={kind}
      head={head}
      facing={up}
      radius={kind === 'confetti' ? 60 : 54}
      unit={unit}
      seed={seed}
      rough={rough}
    />
  );
}

const STATE_AURAS: ReadonlySet<AuraKind> = new Set<AuraKind>([
  'waves',
  'zzz',
  'ticks',
]);

export function Illustration({
  subject,
  robot = false,
  shape,
  peek,
  pose = 'peek',
  side = 'left',
  prop,
  aura = true,
  size = 'page',
  width,
  active,
  seed,
  variant,
  className,
}: IllustrationProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [hovered, setHovered] = useState(false);
  const on = active ?? hovered;
  const rough = (k: number) => `url(#ill-rough-${uid}-${k})`;
  const [w, h] = BOX[size];
  const def: SubjectDef | null = subject ? SUBJECTS[subject] : null;
  const key = subject ?? 'alone';
  const pick = variant ?? key;
  const body: BotShape = shape ?? pickShape(pick);
  const edge: Peek = peek ?? pickPeek(pick);

  const P = POSES[pose];
  const wanted: AuraKind | null =
    aura === false ? null : aura === true ? P.aura : aura;
  const auraKind: AuraKind | null =
    wanted && STATE_AURAS.has(wanted) ? wanted : null;
  const nudge =
    robot && P.place === 'beside'
      ? (side === 'left' ? 1 : -1) * (size === 'page' ? 18 : 12)
      : 0;
  const subj =
    size === 'page'
      ? { x: 52 + nudge, y: 30, s: 1 }
      : { x: 28 + nudge, y: 14, s: 0.68 };
  const subjRef = useRef<SVGGElement>(null);
  const [hide, setHide] = useState<Rect | null>(null);
  useLayoutEffect(() => {
    if (def && robot) setHide(mainBody(subjRef.current));
  }, [def, robot]);

  const wantProp: PropKind | null =
    prop === undefined ? (def?.prop ?? null) : prop;
  const heldKind =
    wantProp && !(HAS[key] ?? []).includes(wantProp) ? wantProp : null;
  const held = (slotShape: BotShape, lean: 1 | -1) => {
    if (!heldKind) return null;
    const p: PropDef = PROPS[heldKind];
    const place = slotPlace(
      slotShape,
      def && P.place !== 'beside' ? 'antenna' : p.slot,
      lean,
    );
    const style = {
      transformOrigin: `${place.pivot[0]}px ${place.pivot[1]}px`,
    } as CSSProperties;
    return (
      <>
        {place.string &&
          FRAMES.map((k) => (
            <g key={k} className={`m-ill__frame m-ill__frame--${k}`}>
              <path
                d={inked(place.string!, false, rng(40 + k), 0.4)}
                className="m-ill__line m-ill__hair"
                filter={rough(k)}
              />
            </g>
          ))}
        <g
          className={`m-ill__held-item m-ill__held-item--${p.move ?? 'swing'}`}
          style={style}
        >
          <g
            transform={`translate(${place.c[0]} ${place.c[1]}) rotate(${place.tilt}) scale(${HELD})`}
          >
            <Inked drawing={p.draw()} rough={rough} hand={7} />
          </g>
        </g>
      </>
    );
  };

  const peeker = (() => {
    if (!def || !robot || !hide || P.place !== 'behind') return null;
    const tall = FOOT - TOP_Y[body];
    const s = Math.min((hide.h * 0.86) / tall, (hide.w * 0.7) / BOT_W, 0.95);
    const ground = hide.y + hide.h - (edge === 'top' ? 1 : 5);
    const bw = BOT_W * s;
    const lean: 1 | -1 = edge === 'left' ? -1 : 1;
    const x =
      edge === 'left'
        ? hide.x + 3
        : edge === 'right'
          ? hide.x + hide.w - bw - 3
          : hide.x + hide.w / 2 - bw / 2;
    const faceMid = ground - (FOOT - FACE_MID[body]) * s;
    const out =
      edge === 'top'
        ? { x: 0, y: -(faceMid - hide.y) - 4, r: 0 }
        : edge === 'left'
          ? { x: -(x - hide.x) - bw * 0.62, y: -2, r: -9 }
          : { x: hide.x + hide.w - x - bw * 0.38, y: -2, r: 9 };
    const style = {
      '--peek-x': `${out.x.toFixed(1)}px`,
      '--peek-y': `${out.y.toFixed(1)}px`,
      '--peek-r': `${out.r}deg`,
      transformOrigin: `${(x + bw / 2).toFixed(1)}px ${ground.toFixed(1)}px`,
    } as CSSProperties;
    return {
      robot: (
        <g>
          <g className={`m-ill__peek m-ill__peek--${edge}`} style={style}>
            <Bot
              x={x}
              ground={ground}
              scale={s}
              shape={body}
              lean={lean}
              seed={seed}
              hand={2}
              rough={rough}
              held={held(body, lean)}
              aura={
                auraKind &&
                botAura(
                  auraKind,
                  body,
                  lean,
                  edge === 'left' ? -1 : edge === 'right' ? 1 : 0,
                  s,
                  size,
                  hash(pick),
                  rough,
                  heldKind != null,
                )
              }
              activeFace={{ eyes: 'wide', mouth: 'tiny' }}
              shadow={false}
            />
          </g>
        </g>
      ),
    };
  })();

  const posed = (() => {
    if (!def || !robot || !hide || P.place === 'behind') return null;
    const tall = FOOT - TOP_Y[body];
    const lean: 1 | -1 = side === 'left' ? -1 : 1;
    let s: number;
    let x: number;
    let ground: number;
    if (P.place === 'beside') {
      s = Math.min((hide.h * 0.92) / tall, 0.72);
      const bw = BOT_W * s;
      x = side === 'left' ? hide.x - bw - 6 : hide.x + hide.w + 6;
      ground = 71;
    } else {
      s = Math.min((hide.w * 0.42) / BOT_W, 0.6);
      const bw = BOT_W * s;
      x = hide.x + hide.w * (side === 'left' ? 0.3 : 0.7) - bw / 2;
      ground = hide.y + 3 + (FOOT - 42) * s;
    }
    const bw = BOT_W * s;
    const outward: -1 | 1 = side === 'left' ? -1 : 1;
    return (
      <>
        <g
          className={`m-ill__pose m-ill__pose--${pose}`}
          style={
            {
              transformOrigin: `${(x + bw / 2).toFixed(1)}px ${ground.toFixed(1)}px`,
              '--lean': outward,
            } as CSSProperties
          }
        >
          <Bot
            x={x}
            ground={ground}
            scale={s}
            shape={body}
            lean={lean}
            seed={seed}
            hand={2}
            rough={rough}
            held={held(body, lean)}
            aura={
              auraKind &&
              botAura(
                auraKind,
                body,
                lean,
                P.place === 'top' ? 0 : outward,
                s,
                size,
                hash(pick),
                rough,
                heldKind != null,
              )
            }
            activeFace={P.face}
            restFace={P.rest}
            shadow={P.place === 'beside'}
          />
        </g>
      </>
    );
  })();

  const alone = !def ? (
    <Bot
      x={size === 'page' ? 72 : 40}
      ground={size === 'page' ? 104 : 66}
      scale={size === 'page' ? 0.92 : 0.6}
      shape={body}
      seed={seed}
      hand={2}
      rough={rough}
      held={held(body, 1)}
    />
  ) : null;

  return (
    <span
      className={`m-ill m-ill--${size}${on ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
      style={{
        width: width ?? (size === 'page' ? 200 : 120),
        aspectRatio: `${w} / ${h}`,
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      aria-hidden="true"
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="m-ill__svg" fill="none">
        <defs>
          {FRAMES.map((k) => (
            <filter
              key={k}
              id={`ill-rough-${uid}-${k}`}
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
        {def && (
          <g
            transform={`translate(${subj.x} ${subj.y}) scale(${subj.s})`}
            className="m-ill__subject"
          >
            {peeker?.robot}
            <g ref={subjRef}>
              <Inked drawing={def.draw()} rough={rough} hand={3} />
            </g>
            {posed}
          </g>
        )}
        {alone}
      </svg>
    </span>
  );
}
