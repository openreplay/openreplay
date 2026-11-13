import {
  type RefObject,
  useEffectEvent,
  useLayoutEffect,
  useSyncExternalStore,
} from 'react';
import { flushSync } from 'react-dom';

import { isCompactHead } from './compact-head';

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

/* What each Fit list spent around its rows and how tall a row was when last
   measured, per header shape: a load asks for the right count at once, at any
   window height, so the rows it paints are the ones it keeps. */
type Fit = { chrome: number; row: number };
const fits: Record<string, Fit> = (() => {
  try {
    const v = JSON.parse(localStorage.getItem(FITS_KEY) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
})();
const fitKey = (list: string) => (isCompactHead() ? `${list}:compact` : list);
// a list never measured borrows the last one measured in the same shape
const ANY = '*';
const countOf = (room: number, row: number) =>
  Math.max(MIN_FIT, Math.floor(room / row + 0.01));

function fitted(list: string): number | null {
  const f = fits[fitKey(list)] ?? fits[fitKey(ANY)];
  if (!f || typeof f !== 'object' || !(f.row > 0)) return null;
  return countOf(window.innerHeight - f.chrome, f.row);
}

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
  return fitted(list) ?? estimate();
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

function publishFit(list: string, fit: Fit) {
  const was = fitted(list);
  const key = fitKey(list);
  const old = fits[key];
  if (old && old.chrome === fit.chrome && old.row === fit.row) return;
  fits[key] = fit;
  fits[fitKey(ANY)] = fit;
  try {
    localStorage.setItem(FITS_KEY, JSON.stringify(fits));
  } catch {}
  if (fitted(list) !== was) emit();
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

function firstRows(prev: Element | null): { top: number; row: number } | null {
  const table =
    prev instanceof HTMLTableElement ? prev : prev?.querySelector('table');
  const body = table?.tBodies[0];
  if (body && body.rows.length > 0) {
    const rect = body.getBoundingClientRect();
    return { top: rect.top, row: rect.height / body.rows.length };
  }
  // a list that is not a table marks its rows; group headings after the
  // first one are not reserved for
  const first = prev?.querySelector('[data-fit-row]');
  if (!first) return null;
  const rect = first.getBoundingClientRect();
  return { top: rect.top, row: rect.height };
}

/** How many rows of the list right before `foot` fit between its head and
 *  the bottom of the box that scrolls, with `foot` kept under them; what
 *  whole rows leave is shared among them (`--m-fit-extra`, the table's rows
 *  add it), so the last row meets the footer. */
function measure(
  foot: HTMLElement,
  box: HTMLElement | null,
): (Fit & { n: number }) | null {
  const list = foot.previousElementSibling as HTMLElement | null;
  // the row's own height: the share is taken off for the reading
  const share = list?.style.getPropertyValue('--m-fit-extra') ?? '';
  list?.style.setProperty('--m-fit-extra', '0px');
  const rows = firstRows(list);
  if (share) list?.style.setProperty('--m-fit-extra', share);
  else list?.style.removeProperty('--m-fit-extra');
  // a tab that is not shown keeps its footer mounted, with no size
  if (!rows || !rows.row || !foot.offsetHeight) return null;
  const { row } = rows;
  let top: number;
  let bottom: number;
  if (box) {
    const b = box.getBoundingClientRect();
    const cs = getComputedStyle(box);
    top = rows.top + box.scrollTop;
    bottom =
      b.top +
      parseFloat(cs.borderTopWidth) +
      box.clientHeight -
      parseFloat(cs.paddingBottom);
  } else {
    top = rows.top + window.scrollY;
    bottom = window.innerHeight;
  }
  // the panel's padding and border under the footer
  let tail = parseFloat(getComputedStyle(foot).marginBottom) || 0;
  for (let p = foot.parentElement; p && p !== box; p = p.parentElement) {
    const cs = getComputedStyle(p);
    tail += parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
  }
  const room = bottom - top - foot.offsetHeight - tail;
  const n = countOf(room, row);
  const left = room - n * row;
  const extra = left > 0 ? Math.floor((left / n) * 100) / 100 : 0;
  // under half a pixel is the same share: a re-measure must not resize the
  // list, or every pass would fire the next one
  if (list && Math.abs(extra - (parseFloat(share) || 0)) >= 0.5)
    list.style.setProperty('--m-fit-extra', `${extra}px`);
  return {
    n,
    chrome: Math.round((window.innerHeight - room) * 100) / 100,
    row: Math.round(row * 100) / 100,
  };
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
  // before the first paint, so the count a page shows is the measured one
  useLayoutEffect(() => {
    const el = foot.current;
    if (!fitted || !list || !el) return undefined;
    const box = scrollParent(el);
    const run = () => {
      const fit = measure(el, box);
      if (fit == null) return;
      const was = getRowsPerPage(list);
      publishFit(list, fit);
      if (fit.n !== was) changed();
    };
    let timer = 0;
    const later = () => {
      window.clearTimeout(timer);
      // the menu took its new width in one frame: count inside that frame
      if (document.documentElement.hasAttribute('data-nav-instant'))
        flushSync(run);
      else timer = window.setTimeout(run, 150);
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
      (el.previousElementSibling as HTMLElement | null)?.style.removeProperty(
        '--m-fit-extra',
      );
    };
  }, [fitted, list]);
  return fitted;
}
