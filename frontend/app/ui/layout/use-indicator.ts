import { type RefObject, useEffect, useLayoutEffect, useState } from 'react';

export interface IndicatorBox {
  x: number;
  w: number;
}

/**
 * Position of the active item inside `ref`, for a sliding indicator (tab ink,
 * segmented thumb). Follows selection, relabelling and resizes through
 * observers set up once.
 */
export function useIndicator(
  ref: RefObject<HTMLElement | null>,
  activeSelector: string,
) {
  const [box, setBox] = useState<IndicatorBox | null>(null);
  const [live, setLive] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const on = el.querySelector<HTMLElement>(activeSelector);
      if (!on) return setBox(null);
      setBox((prev) =>
        prev && prev.x === on.offsetLeft && prev.w === on.offsetWidth
          ? prev
          : { x: on.offsetLeft, w: on.offsetWidth },
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mo = new MutationObserver(measure);
    mo.observe(el, {
      attributes: true,
      subtree: true,
      childList: true,
      characterData: true,
      attributeFilter: ['data-state'],
    });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [activeSelector]);

  // live a frame after the first placement, so it appears in place rather
  // than sliding in from 0 (also when the first active item comes later)
  const placed = box != null;
  useEffect(() => {
    if (!placed || live) return undefined;
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, [placed, live]);

  return { box, live };
}
