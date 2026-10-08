import { CountSuffix } from '@/ui/data/CountSuffix';
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import './filter-strip.css';

export interface StripItem {
  key: string;
  label: string;

  count?: number;
  icon?: ReactNode;
}

export interface FilterStripProps {
  items: readonly StripItem[];

  selected: readonly string[];
  onSelect: (key: string) => void;

  label: string;
}

export function FilterStrip({
  items,
  selected,
  onSelect,
  label,
}: FilterStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [live, setLive] = useState(false);

  const one = selected.length === 1 ? selected[0] : null;
  // callers pass inline arrays: re-measure when the buttons change, not per render
  const shape = items
    .map((i) => `${i.key}:${i.label}:${i.count ?? ''}`)
    .join('|');

  const measureRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const strip = ref.current;
    if (!strip || one == null) {
      measureRef.current = () => {};
      setThumb(null);
      setLive(false);
      return undefined;
    }
    const measure = () => {
      const el = strip.querySelector<HTMLElement>(
        `[data-key="${CSS.escape(one)}"]`,
      );
      if (!el) return setThumb(null);
      const next = {
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight,
      };
      setThumb((prev) =>
        prev &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.w === next.w &&
        prev.h === next.h
          ? prev
          : next,
      );
    };
    measureRef.current = measure;
    measure();
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, [one, shape]);

  // a resize (the strip wrapping, a web font swapping in) re-places the thumb
  // without sliding it; set up per button set, not per selection, so a click
  // keeps its slide. The first callback is just the initial observation.
  useEffect(() => {
    const strip = ref.current;
    if (!strip) return undefined;
    let primed = false;
    const ro = new ResizeObserver(() => {
      if (!primed) {
        primed = true;
        return;
      }
      setLive(false);
      measureRef.current();
      requestAnimationFrame(() => setLive(true));
    });
    ro.observe(strip);
    strip.querySelectorAll('[data-key]').forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [shape]);

  return (
    <div className="m-seg" role="group" aria-label={label} ref={ref}>
      {thumb && (
        <span
          className={`m-seg__thumb m-travel${live ? ' is-live' : ''}`}
          aria-hidden="true"
          style={{
            transform: `translate(${thumb.x}px, ${thumb.y}px)`,
            width: thumb.w,
            height: thumb.h,
          }}
        />
      )}
      {items.map((it) => {
        const on = selected.includes(it.key);
        return (
          <button
            key={it.key}
            type="button"
            data-key={it.key}
            aria-pressed={on}
            className={`m-seg__item${on ? ' is-on' : ''}${thumb ? ' has-thumb' : ''}`}
            onClick={() => onSelect(it.key)}
          >
            {it.icon}
            {it.label}
            {it.count != null && <CountSuffix n={it.count} />}
          </button>
        );
      })}
    </div>
  );
}
