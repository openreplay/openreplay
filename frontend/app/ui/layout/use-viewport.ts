import { useEffect, useSyncExternalStore } from 'react';

/**
 * The plane's width band: `wide` (≥ 1080) is the design as is, `narrow`
 * (640–1079) keeps the rail with fewer columns and wrapping heads, `phone`
 * (< 640) turns the rail into a sheet. The shell writes it on `<html>` as
 * `data-viewport`, so stylesheets select on it; components that change
 * markup read this hook.
 */
export type ViewportBand = 'wide' | 'narrow' | 'phone';

const NARROW_Q = '(max-width: 1079px)';
const PHONE_Q = '(max-width: 639px)';

const read = (): ViewportBand => {
  if (typeof window === 'undefined') return 'wide';
  if (window.matchMedia(PHONE_Q).matches) return 'phone';
  if (window.matchMedia(NARROW_Q).matches) return 'narrow';
  return 'wide';
};

const subscribe = (onChange: () => void) => {
  const queries = [NARROW_Q, PHONE_Q].map((q) => window.matchMedia(q));
  queries.forEach((q) => q.addEventListener('change', onChange));
  return () =>
    queries.forEach((q) => q.removeEventListener('change', onChange));
};

/** Re-renders only when a band's edge is crossed. */
export function useViewport(): ViewportBand {
  return useSyncExternalStore(subscribe, read, () => 'wide');
}

/** For the shell: the band, written where CSS can read it. */
export function useViewportAttribute(): ViewportBand {
  const band = useViewport();
  useEffect(() => {
    document.documentElement.dataset.viewport = band;
    return () => {
      delete document.documentElement.dataset.viewport;
    };
  }, [band]);
  return band;
}

/** How many tiers of a table's columns a band shows (`Column.priority`). */
export const columnTiersOf = (band: ViewportBand): 1 | 2 | 3 =>
  band === 'wide' ? 3 : band === 'narrow' ? 2 : 1;
