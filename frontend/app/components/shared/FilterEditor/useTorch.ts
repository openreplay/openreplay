import { useEffect, useRef } from 'react';

const NOTICE_AT = 220;

const FULL_RADIUS = 130;

const EASE = 0.18;

export function useTorch(enabled = true) {
  const host = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el || !enabled) return undefined;

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches)
      return undefined;

    let px = -1e4;
    let py = -1e4;
    let radius = 0;
    let shownR = '';
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
      const dx = Math.max(r.left - px, 0, px - r.right);
      const dy = Math.max(r.top - py, 0, py - r.bottom);
      return Math.hypot(dx, dy);
    };

    const step = () => {
      const r = rect();
      const away = distance(r);
      const want = away > NOTICE_AT ? 0 : FULL_RADIUS * (1 - away / NOTICE_AT);

      radius += (want - radius) * EASE;
      if (radius < 0.4 && want === 0) {
        radius = 0;
        running = false;
      }

      // the light's position only matters while it is lit
      if (radius > 0) {
        el.style.setProperty('--m-torch-x', `${Math.round(px - r.left)}px`);
        el.style.setProperty('--m-torch-y', `${Math.round(py - r.top)}px`);
      }
      const nextR = `${radius.toFixed(1)}px`;
      if (nextR !== shownR)
        el.style.setProperty('--m-torch-r', (shownR = nextR));

      frame = running ? requestAnimationFrame(step) : 0;
    };

    const wake = () => {
      if (running) return;
      // a move-only layout change (a nav group opening above) fires no resize:
      // let an idle check re-measure, at most twice a second
      if (performance.now() - measuredAt > 500) box = null;
      // idle and out of reach: nothing to animate, nothing to write
      if (radius === 0 && distance(rect()) > NOTICE_AT) return;
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
      if (radius > 0 && !running) {
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
    // content shifting above the field moves it without a scroll or resize
    ro.observe(document.documentElement);

    return () => {
      document.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('scroll', invalidate, { capture: true });
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
      running = false;
    };
  }, [enabled]);

  return host;
}
