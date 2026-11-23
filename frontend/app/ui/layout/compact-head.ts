import { useSyncExternalStore } from 'react';

/**
 * The page header folds to one row on a short window (laptops) and gives the
 * height to the content. Compact below 900px of window height, full again
 * from 940 so a resize near the line does not flicker. Read at load, so the
 * first frame is drawn in the right shape.
 */
const SHORT_BELOW = 900;
const TALL_FROM = 940;

let short = typeof window !== 'undefined' && window.innerHeight < SHORT_BELOW;
const listeners = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    const h = window.innerHeight;
    const next = short ? h < TALL_FROM : h < SHORT_BELOW;
    if (next === short) return;
    short = next;
    listeners.forEach((l) => l());
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Is the page header compact now (outside React)? */
export const isCompactHead = () =>
  short && !window.matchMedia('(max-width: 639px)').matches;

/** Is the window short enough for the compact header? Phone is the caller's. */
export function useShortWindow(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => short,
    () => false,
  );
}
