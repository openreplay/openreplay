import { useCallback, useEffect, useRef, useState } from 'react';

const WORTH_COLLAPSING = 0;

const WORTH_COLLAPSING_ON_SCROLL = 2;

const READING_AT = 28;

export function useFilterCollapse(rowCount: number) {
  const [collapsed, setCollapsed] = useState(false);

  const overridden = useRef(false);

  const anchor = useRef<HTMLElement | null>(null);

  const toggle = useCallback(() => {
    overridden.current = true;
    setCollapsed((c) => !c);
  }, []);

  useEffect(() => {
    overridden.current = false;
    setCollapsed(false);
  }, [rowCount]);

  useEffect(() => {
    const el = anchor.current;
    if (!el) return undefined;
    const scroller = findScroller(el);
    if (!scroller) return undefined;

    const onScroll = () => {
      if (overridden.current) return;

      if (rowCount <= WORTH_COLLAPSING_ON_SCROLL) return;

      if (scroller.scrollTop > READING_AT) setCollapsed(true);
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [rowCount]);

  return {
    collapsed,
    toggle,
    anchor,
    canCollapse: rowCount > WORTH_COLLAPSING,
  };
}

function findScroller(from: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = from.parentElement;
  while (el) {
    const oy = getComputedStyle(el).overflowY;
    if (oy === 'auto' || oy === 'scroll') return el;
    el = el.parentElement;
  }
  return null;
}
