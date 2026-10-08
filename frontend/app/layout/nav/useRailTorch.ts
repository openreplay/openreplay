import { useEffect, useRef } from 'react';

const NOTICE_AT = 150;

export interface RailTorchOptions {
  reach?: number;

  line?: 'left' | 'right';
}

const EASE = 0.18;

export function useRailTorch<T extends HTMLElement>({
  reach = NOTICE_AT,
  line = 'left',
}: RailTorchOptions = {}) {
  const host = useRef<T | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches)
      return undefined;

    let px = -1e4;
    let py = -1e4;
    let on = 0;
    let y = 0;
    let shownOn = '';
    let shownY = '';
    // cached: a pointer move must not force layout; resize / scroll invalidate it
    let box: DOMRect | null = null;
    let frame = 0;
    let running = false;

    let measuredAt = 0;
    const rect = () => {
      if (!box) {
        box = el.getBoundingClientRect();
        measuredAt = performance.now();
      }
      return box;
    };
    const invalidate = () => {
      box = null;
    };
    const distance = (r: DOMRect) => {
      const dx = Math.abs(px - (line === 'right' ? r.right : r.left));
      const dy = Math.max(r.top - py, 0, py - r.bottom);
      return Math.hypot(dx, dy);
    };

    const step = () => {
      const r = rect();
      const away = distance(r);
      const want = away > reach ? 0 : 1 - away / reach;
      const wantY = Math.min(Math.max(py - r.top, 0), r.height);

      on += (want - on) * EASE;
      y = on < 0.02 ? wantY : y + (wantY - y) * EASE;

      if (on < 0.01 && want === 0) {
        on = 0;
        running = false;
      }

      const nextOn = on.toFixed(3);
      const nextY = `${y.toFixed(1)}px`;
      if (nextOn !== shownOn)
        el.style.setProperty('--m-rail-on', (shownOn = nextOn));
      if (nextY !== shownY)
        el.style.setProperty('--m-rail-y', (shownY = nextY));

      frame = running ? requestAnimationFrame(step) : 0;
    };

    const wake = () => {
      if (running) return;
      // a move-only layout change (a nav group opening above) fires no resize:
      // let an idle check re-measure, at most twice a second
      if (performance.now() - measuredAt > 500) box = null;
      // idle and out of reach: nothing to animate, nothing to write
      if (on === 0 && distance(rect()) > reach) return;
      running = true;
      frame = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      wake();
    };
    const onLeave = () => {
      px = -1e4;
      py = -1e4;
      if (on > 0 && !running) {
        running = true;
        frame = requestAnimationFrame(step);
      }
    };

    const root = document.documentElement;
    document.addEventListener('pointermove', onMove, { passive: true });
    // pointerleave on document never fires; the root element's does
    root.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('resize', invalidate, { passive: true });
    window.addEventListener('scroll', invalidate, {
      passive: true,
      capture: true,
    });

    const ro = new ResizeObserver(invalidate);
    ro.observe(el);

    return () => {
      document.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('scroll', invalidate, { capture: true });
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reach, line]);

  return host;
}
