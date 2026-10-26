import {
  type RefObject,
  useEffect,
  useEffectEvent,
  useSyncExternalStore,
} from 'react';

/** One rows-per-page choice for every paged list, remembered. Fit, the
 *  default, shows as many rows as the window holds above the pager. */
export const ROWS_OPTIONS = [10, 25, 50, 100] as const;
export type RowsPerPage = (typeof ROWS_OPTIONS)[number];
export type RowsChoice = RowsPerPage | 'fit';
export const DEFAULT_ROWS: RowsPerPage = 10;

const KEY = '__or_rows_per_page';
const FITS_KEY = '__or_rows_fit';
// what a list spends around its rows before its page has measured them
const LIST_CHROME = 290;
const MIN_FIT = 5;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function stored(): RowsChoice {
  try {
    const n = Number(localStorage.getItem(KEY));
    return (ROWS_OPTIONS as readonly number[]).includes(n)
      ? (n as RowsPerPage)
      : 'fit';
  } catch {
    return 'fit';
  }
}

// rows each Fit list held when last measured, so a reload asks for them at once
const fits: Record<string, number> = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(FITS_KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
})();

function estimate(): number {
  const root = getComputedStyle(document.documentElement);
  const rem = parseFloat(root.fontSize) || 16;
  const row =
    (parseFloat(root.getPropertyValue('--m-list-row-height')) || 3.5) * rem + 1;
  return Math.max(
    MIN_FIT,
    Math.floor((window.innerHeight - LIST_CHROME) / row),
  );
}

let current: RowsChoice | undefined;

export function getRowsChoice(): RowsChoice {
  return (current ??= stored());
}

/** The page size of `list`: the choice, or under Fit the rows its page last
 *  measured. A list without a name reads Fit as 10. */
export function getRowsPerPage(list?: string): number {
  const c = getRowsChoice();
  if (c !== 'fit') return c;
  if (!list) return DEFAULT_ROWS;
  return fits[list] ?? estimate();
}

export function setRowsPerPage(n: RowsChoice) {
  if (n === getRowsChoice()) return;
  current = n;
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    // private mode: the choice lasts for the page
  }
  emit();
}

function publishFit(list: string, n: number) {
  if (fits[list] === n) return;
  fits[list] = n;
  try {
    localStorage.setItem(FITS_KEY, JSON.stringify(fits));
  } catch {}
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useRowsChoice(): RowsChoice {
  return useSyncExternalStore(subscribe, getRowsChoice, getRowsChoice);
}

export function useRowsPerPage(list?: string): number {
  const get = () => getRowsPerPage(list);
  return useSyncExternalStore(subscribe, get, get);
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement;
  while (p && !/(auto|scroll)/.test(getComputedStyle(p).overflowY))
    p = p.parentElement;
  return p;
}

/** How many rows of the table right before `foot` fit between its head and
 *  the bottom of the box that scrolls, with `foot` kept under them. */
function measure(foot: HTMLElement, box: HTMLElement | null): number | null {
  const prev = foot.previousElementSibling;
  const table =
    prev instanceof HTMLTableElement ? prev : prev?.querySelector('table');
  const body = table?.tBodies[0];
  // a tab that is not shown keeps its footer mounted, with no size
  if (!body || body.rows.length === 0 || !foot.offsetHeight) return null;
  const rect = body.getBoundingClientRect();
  const row = rect.height / body.rows.length;
  let top: number;
  let bottom: number;
  if (box) {
    const b = box.getBoundingClientRect();
    const cs = getComputedStyle(box);
    top = rect.top + box.scrollTop;
    bottom =
      b.top +
      parseFloat(cs.borderTopWidth) +
      box.clientHeight -
      parseFloat(cs.paddingBottom);
  } else {
    top = rect.top + window.scrollY;
    bottom = window.innerHeight;
  }
  // the panel's padding and border under the footer
  let tail = parseFloat(getComputedStyle(foot).marginBottom) || 0;
  for (let p = foot.parentElement; p && p !== box; p = p.parentElement) {
    const cs = getComputedStyle(p);
    tail += parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
  }
  const room = bottom - top - foot.offsetHeight - tail;
  return Math.max(MIN_FIT, Math.floor(room / row + 0.01));
}

/** Under Fit, measures `list` from its footer and follows the window and the
 *  page above the table; a new count is published and handed to `onFit`. */
export function useFitRows(
  list: string | undefined,
  foot: RefObject<HTMLElement | null>,
  onFit?: () => void,
) {
  const fitted = useRowsChoice() === 'fit' && list != null;
  const changed = useEffectEvent(() => onFit?.());
  useEffect(() => {
    const el = foot.current;
    if (!fitted || !list || !el) return undefined;
    const box = scrollParent(el);
    const run = () => {
      const n = measure(el, box);
      if (n == null) return;
      const was = getRowsPerPage(list);
      publishFit(list, n);
      if (n !== was) changed();
    };
    let timer = 0;
    const later = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 150);
    };
    run();
    const ro = new ResizeObserver(later);
    ro.observe(el);
    ro.observe(box ?? document.documentElement);
    if (box) for (const child of Array.from(box.children)) ro.observe(child);
    window.addEventListener('resize', later);
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener('resize', later);
    };
  }, [fitted, list]);
  return fitted;
}
