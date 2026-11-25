import { useEffect, useState } from 'react';

function Cells({ art, className }: { art: string[]; className?: string }) {
  const w = Math.max(...art.map((r) => r.length));
  return (
    <svg
      className={className}
      viewBox={`0 0 ${w} ${art.length}`}
      aria-hidden="true"
    >
      {art.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '#' ? (
            <rect
              key={`${x}-${y}`}
              x={x + 0.07}
              y={y + 0.07}
              width={0.86}
              height={0.86}
              rx={0.2}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export const PIXEL = {
  spark: ['..#..', '.###.', '##.##', '.###.', '..#..'],
  arrow: ['...#..', '....#.', '######', '....#.', '...#..'],
  heart: [
    '.##..##.',
    '########',
    '########',
    '.######.',
    '..####..',
    '...##...',
  ],
  play: ['##....', '####..', '######', '####..', '##....'],
  star: [
    '...#...',
    '...#...',
    '#######',
    '.#####.',
    '..###..',
    '.##.##.',
    '##...##',
  ],
  eye: ['..####..', '.#....#.', '#..##..#', '.#....#.', '..####..'],
  bolt: ['...##', '..##.', '.####', '..##.', '.##..', '##...'],
} as const;

export type PixelKind = keyof typeof PIXEL;

export function Pixel({
  kind,
  className,
}: {
  kind: PixelKind;
  className?: string;
}) {
  return <Cells art={[...PIXEL[kind]]} className={className} />;
}

export const PixelSpark = ({ className }: { className?: string }) => (
  <Pixel kind="spark" className={className} />
);
export const PixelArrow = ({ className }: { className?: string }) => (
  <Pixel kind="arrow" className={className} />
);

const BURST: string[][] = [
  ['.......', '.......', '...#...', '..###..', '...#...', '.......', '.......'],
  ['.......', '...#...', '..###..', '.##.##.', '..###..', '...#...', '.......'],
  ['...#...', '..#.#..', '.#...#.', '#..#..#', '.#...#.', '..#.#..', '...#...'],
  ['#..#..#', '.#...#.', '.......', '##.#.##', '.......', '.#...#.', '#..#..#'],
  ['#.....#', '.......', '...#...', '..###..', '...#...', '.......', '#.....#'],
  ['.......', '...#...', '..###..', '.##.##.', '..###..', '...#...', '.......'],
];

export function PixelBurst({
  playing,
  className,
  interval = 110,
}: {
  playing: boolean;
  className?: string;
  interval?: number;
}) {
  const REST = BURST.length - 1;
  const [tick, setTick] = useState(0);
  const animate =
    playing &&
    !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (!animate) return;
    const id = window.setInterval(() => setTick((x) => x + 1), interval);
    return () => {
      window.clearInterval(id);
      setTick(0);
    };
  }, [animate, interval]);
  const f = animate ? tick % BURST.length : REST;
  const frame = BURST[f]!;
  return (
    <svg
      className={`m-pxburst${playing ? ' is-playing' : ''}${className ? ` ${className}` : ''}`}
      viewBox="0 0 7 7"
      aria-hidden="true"
    >
      {frame.flatMap((row, y) =>
        [...row].map((ch, x) =>
          ch === '#' ? (
            <rect
              key={`${x}-${y}`}
              className={playing && (x + y + f) % 2 ? 'is-b' : 'is-a'}
              x={x + 0.07}
              y={y + 0.07}
              width={0.86}
              height={0.86}
              rx={0.2}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
