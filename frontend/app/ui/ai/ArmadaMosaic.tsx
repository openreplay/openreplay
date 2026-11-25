import { SessionAvatar } from '@/ui/data/SessionAvatar';
import type { AvatarFace } from '@/ui/data/avatar';
import { type CSSProperties, useMemo, useState } from 'react';

import { Pixel, type PixelKind } from './PixelArt';
import './ai.css';

const HOVER_FACES: AvatarFace[] = [
  { eyes: 'heart', mouth: 'bigSmile' },
  { eyes: 'round', mouth: 'oh' },
  { eyes: 'goggles', mouth: 'open' },
  { eyes: 'happy', mouth: 'bigSmile' },
  { eyes: 'content', mouth: 'cat' },
];
const DRAWINGS: PixelKind[] = ['heart', 'spark', 'play', 'star', 'eye'];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return s / 0x100000000;
  };
}

interface TileSpec {
  key: string;
  seed: string;
  drawing: PixelKind;
  ink: 'accent' | 'teal';
  dur: number;
  delay: number;
  still: boolean;
  start: number;
}

function Tile({ t, size }: { t: TileSpec; size: number }) {
  const [n, setN] = useState(-1);
  const [hover, setHover] = useState(false);
  const face =
    n >= 0 ? HOVER_FACES[(t.start + n) % HOVER_FACES.length] : undefined;
  return (
    <span
      className={`m-am__tile${t.still ? ' is-still' : ''}${hover ? ' is-hover' : ''}`}
      style={
        {
          '--dur': `${t.dur}s`,
          '--delay': `${t.delay}s`,
          width: size,
          height: size,
        } as CSSProperties
      }
      onPointerEnter={() => {
        setHover(true);
        setN((x) => x + 1);
      }}
      onPointerLeave={() => setHover(false)}
    >
      <span className="m-am__layer is-bot">
        <SessionAvatar
          seed={t.seed}
          size={size}
          face={hover ? face : undefined}
        />
      </span>
      {!t.still && (
        <span className={`m-am__layer is-draw ink-${t.ink}`}>
          <Pixel kind={t.drawing} />
        </span>
      )}
    </span>
  );
}

export interface ArmadaMosaicProps {
  cols?: number;
  rows?: number;
  size?: number;
  seed?: number;
  className?: string;
}

export function ArmadaMosaic({
  cols = 6,
  rows = 5,
  size = 52,
  seed = 1123,
  className,
}: ArmadaMosaicProps) {
  const tiles = useMemo<TileSpec[]>(() => {
    const rand = rng(seed);
    return Array.from({ length: cols * rows }, (_, i) => ({
      key: String(i),
      seed: `armada-${seed}-${i}`,
      drawing: DRAWINGS[Math.floor(rand() * DRAWINGS.length)]!,
      ink: rand() < 0.55 ? 'accent' : 'teal',
      dur: 9 + rand() * 7,
      delay: -rand() * 16,
      still: rand() < 0.3,
      start: Math.floor(rand() * HOVER_FACES.length),
    }));
  }, [cols, rows, seed]);
  return (
    <div
      className={`m-am${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <div className="m-am__wash" />
      <div
        className="m-am__grid"
        style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}
      >
        {tiles.map((t) => (
          <Tile key={t.key} t={t} size={size} />
        ))}
      </div>
    </div>
  );
}
