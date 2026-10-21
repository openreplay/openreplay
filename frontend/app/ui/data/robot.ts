import { Avatar, Style, type StyleDefinition } from '@dicebear/core';

import { type AvatarFace, lightVariant } from './avatar';
import pixelbot from './pixelbot.json';

const PITCH = 100 / 12;
const r2 = (v: number) => Math.round(v * 100) / 100;
const n = (v: number) =>
  String(r2(v)).replace(/^0\./, '.').replace(/^-0\./, '-.');
const SQUARE =
  'h3.7a1.9 1.9 0 0 1 1.9 1.9v3.7a1.9 1.9 0 0 1-1.9 1.9h-3.7a1.9 1.9 0 0 1-1.9-1.9v-3.7a1.9 1.9 0 0 1 1.9-1.9';
const cellsPath = (cells: [number, number][], ox = 0, oy = 0) => {
  let px = 0;
  let py = 0;
  return cells
    .map(([c, r], i) => {
      const x = r2(2.32 + c * PITCH - ox);
      const y = r2(0.42 + r * PITCH - oy);
      const move = i === 0 ? `M${n(x)} ${n(y)}` : `m${n(x - px)} ${n(y - py)}`;
      px = x;
      py = y;
      return move + SQUARE;
    })
    .join('');
};

interface Art {
  row: number;
  art: string[];
}
const lit = ({ row, art }: Art): [number, number][] =>
  art.flatMap((line, i) =>
    [...line].flatMap((ch, col) =>
      ch === '#' ? [[col, row + i] as [number, number]] : [],
    ),
  );

const GLOW = { type: 'color', name: 'glow' } as const;
const path = (
  cells: [number, number][],
  o: { ox?: number; oy?: number; half?: boolean; cls?: string } = {},
) => ({
  name: 'path',
  type: 'element' as const,
  attributes: {
    d: cellsPath(cells, o.ox, o.oy),
    fill: GLOW,
    ...(o.half ? { 'fill-opacity': '.55' } : {}),
    ...(o.cls ? { class: o.cls } : {}),
  },
});

const EYES: Record<string, string[]> = {
  dots: ['............', '............', '...#....#...'],
  goggles: ['..###..###..', '..#.#..#.#..', '..###..###..'],
  heart: ['..#.#..#.#..', '..###..###..', '...#....#...'],
  visor: ['............', '..########..', '............'],
  cyclops: ['.....##.....', '....####....', '.....##.....'],
  content: ['............', '..#.#..#.#..', '...#....#...'],
};

const MOUTHS: Record<string, string[]> = {
  oh: ['.....##.....', '.....##.....'],
  cat: ['...#.##.#...', '....#..#....'],
  dot: ['............', '.....##.....'],
};

const CHEEKS: Record<string, Art> = {
  dots: { row: 7, art: ['.#........#.'] },
  blush: { row: 7, art: ['.##......##.'] },
};
const GEAR: Record<string, Art> = {
  beacon: { row: 1, art: ['.....##.....'] },
  ears: { row: 4, art: ['#..........#', '#..........#'] },
};
const GLOWS = [
  '#7dd3fc',
  '#5eead4',
  '#86efac',
  '#bef264',
  '#fde68a',
  '#fdba74',
  '#f9a8d4',
  '#c4b5fd',
  '#ffffff',
  '#fca5a5',
  '#fda4af',
  '#f0abfc',
  '#d8b4fe',
  '#a5b4fc',
  '#93c5fd',
  '#67e8f9',
  '#6ee7b7',
  '#fcd34d',
];

type Base = typeof pixelbot;
const base = pixelbot as Base;
const comps = base.components as unknown as Record<
  string,
  { width: number; height: number; variants: Record<string, unknown> }
>;
const EYES_AT = { ox: 17, oy: 25 };
const MOUTH_AT = { ox: 17, oy: 67 };

const DEFINITION = {
  ...base,
  $comment:
    "DiceBear's pixelbot (CC0 1.0) with OpenReplay's own parts added. See robot.ts.",
  canvas: {
    ...base.canvas,
    elements: [
      base.canvas.elements[0],
      { name: 'cheeks', type: 'component' },
      { name: 'gear', type: 'component' },
      ...base.canvas.elements.slice(1),
    ],
  },
  components: {
    ...comps,
    eyes: {
      ...comps.eyes,
      variants: {
        ...comps.eyes!.variants,
        ...Object.fromEntries(
          Object.entries(EYES).map(([name, art]) => [
            name,
            {
              elements: art.flatMap((_, i) => {
                const cells = lit({ row: 3 + i, art: [art[i]!] });
                return cells.length
                  ? [path(cells, { ...EYES_AT, cls: `dbpb-er${3 + i}` })]
                  : [];
              }),
            },
          ]),
        ),
      },
    },
    mouth: {
      ...comps.mouth,
      variants: {
        ...comps.mouth!.variants,
        ...Object.fromEntries(
          Object.entries(MOUTHS).map(([name, art]) => [
            name,
            { elements: [path(lit({ row: 8, art }), MOUTH_AT)] },
          ]),
        ),
      },
    },
    cheeks: {
      width: 100,
      height: 100,
      probability: 30,
      variants: Object.fromEntries(
        Object.entries(CHEEKS).map(([name, a]) => [
          name,
          { elements: [path(lit(a), { half: true })] },
        ]),
      ),
    },
    gear: {
      width: 100,
      height: 100,
      probability: 25,
      variants: Object.fromEntries(
        Object.entries(GEAR).map(([name, a]) => [
          name,
          { elements: [path(lit(a), { half: true })] },
        ]),
      ),
    },
  },
  colors: { ...base.colors, glow: { values: GLOWS } },
};

// built on the first avatar drawn, not when the module loads
let style: Style | undefined;
let faceStyle: Style | undefined;
const styleOf = (faceOnly: boolean) =>
  faceOnly
    ? // the illustrations draw their own head: eyes and mouth only, same picks
      (faceStyle ??= new Style({
        ...DEFINITION,
        canvas: {
          ...DEFINITION.canvas,
          elements: base.canvas.elements.slice(1),
        },
      } as unknown as StyleDefinition))
    : (style ??= new Style(DEFINITION as unknown as StyleDefinition));

export const ROBOT_PARTS = {
  eyes: Object.keys(DEFINITION.components.eyes.variants),
  mouth: Object.keys(DEFINITION.components.mouth.variants),
  cheeks: Object.keys(CHEEKS),
  gear: Object.keys(GEAR),
  glow: GLOWS,
};

export interface RobotArt {
  dark: string;
  light: string;
}

const cache = new Map<string, RobotArt>();

export function robotArt(
  seed: string,
  face?: AvatarFace,
  faceOnly = false,
): RobotArt {
  const key = `${faceOnly ? 'f:' : ''}${face ? `${seed}|${face.eyes ?? ''}|${face.mouth ?? ''}` : seed}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const avatar = new Avatar(styleOf(faceOnly), {
    seed,
    backgroundColor: ['ffffff00'],
    ...(face?.eyes ? { eyesVariant: [face.eyes] } : {}),
    ...(face?.mouth ? { mouthVariant: [face.mouth] } : {}),
  } as never);
  const svg = avatar.toString();
  const glow = String(
    (avatar.toJSON().options as { glowColor?: string[] }).glowColor?.[0] ??
      GLOWS[0],
  ).toLowerCase();
  const art: RobotArt = {
    dark: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    light: lightVariant(svg, glow, glow === '#ffffff'),
  };
  cache.set(key, art);
  return art;
}
