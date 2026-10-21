import { type RefObject, useLayoutEffect } from 'react';

/** The grid's row track, px: widgets pack in these, so none leaves a hole. */
const ROW = 2;

/** Spans a widget over as many row tracks as it is tall, plus the gap under it. */
export function useMasonrySpan(ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = ref.current;
    const grid = el?.parentElement;
    if (!el || !grid) return undefined;
    const fit = () => {
      const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
      el.style.gridRowEnd = `span ${Math.ceil((el.offsetHeight + gap) / ROW)}`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
}
