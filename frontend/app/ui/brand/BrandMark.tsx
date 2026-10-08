import { type CSSProperties, useEffect, useRef, useState } from 'react';

import {
  MARK_ANIMATED_PROPS,
  MARK_REST,
  MARK_TURNED,
  MARK_VIEWBOX,
} from './brand-mark';
import './brand-mark.css';

export interface BrandMarkProps {
  size?: number;

  playOnMount?: boolean;

  loop?: boolean;
  className?: string;
}

export function BrandMark({
  size = 17,
  playOnMount = false,
  loop = false,
  className,
}: BrandMarkProps) {
  const [turned, setTurned] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (loop) return;
    if (!playOnMount) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    timers.current.push(window.setTimeout(() => setTurned(true), 420));
    timers.current.push(window.setTimeout(() => setTurned(false), 1120));
    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, [playOnMount, loop]);

  return (
    <svg
      className={`m-brandmark${turned ? ' is-turned' : ''}${loop ? ' is-looping' : ''}${className ? ` ${className}` : ''}`}
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      style={
        {
          '--mark-a0x': `${MARK_REST.a.x}px`,
          '--mark-a0y': `${MARK_REST.a.y}px`,
          '--mark-a0s': `${MARK_REST.a.size}px`,
          '--mark-a0r': `${MARK_REST.a.rx}px`,
          '--mark-b0x': `${MARK_REST.b.x}px`,
          '--mark-b0y': `${MARK_REST.b.y}px`,
          '--mark-b0s': `${MARK_REST.b.size}px`,
          '--mark-b0r': `${MARK_REST.b.rx}px`,
          '--mark-ax': `${MARK_TURNED.a.x}px`,
          '--mark-ay': `${MARK_TURNED.a.y}px`,
          '--mark-as': `${MARK_TURNED.a.size}px`,
          '--mark-ar': `${MARK_TURNED.a.rx}px`,
          '--mark-bx': `${MARK_TURNED.b.x}px`,
          '--mark-by': `${MARK_TURNED.b.y}px`,
          '--mark-bs': `${MARK_TURNED.b.size}px`,
          '--mark-br': `${MARK_TURNED.b.rx}px`,
          '--mark-props': MARK_ANIMATED_PROPS.join(', '),
        } as CSSProperties
      }
    >
      <g fill="currentColor">
        <rect
          className="m-brandmark__s m-brandmark__s--a"
          x={MARK_REST.a.x}
          y={MARK_REST.a.y}
          width={MARK_REST.a.size}
          height={MARK_REST.a.size}
          rx={MARK_REST.a.rx}
        />
        <rect
          className="m-brandmark__s m-brandmark__s--b"
          x={MARK_REST.b.x}
          y={MARK_REST.b.y}
          width={MARK_REST.b.size}
          height={MARK_REST.b.size}
          rx={MARK_REST.b.rx}
        />
      </g>
    </svg>
  );
}
