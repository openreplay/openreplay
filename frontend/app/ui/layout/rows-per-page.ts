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

// a count the list's own layout bounced back from, until the window resizes
const held: Record<string, number> = {};

function fitted(list: string): number | null {
  const f = fits[fitKey(list)] ?? fits[fitKey(ANY)];
  if (!f || typeof f !== 'object' || !(f.row > 0)) return null;
  return Math.min(
    countOf(window.innerHeight - f.chrome, f.row),
    held[list] ?? Infinity,
  );
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

function firstRows(
  prev: Element | null,
): { top: number; row: number; end: number; shown: number } | null {
  const table =
    prev instanceof HTMLTableElement ? prev : prev?.querySelector('table');
  const body = table?.tBodies[0];
  if (body && body.rows.length > 0) {
    const rect = body.getBoundingClientRect();
    return {
      top: rect.top,
      row: rect.height / body.rows.length,
      end: rect.bottom,
      shown: body.rows.length,
    };
  }
  // a list that is not a table marks its rows; group headings after the
  // first one are not reserved for
  const marked = prev?.querySelectorAll('[data-fit-row]');
  if (!marked?.length) return null;
  const rect = marked[0].getBoundingClientRect();
  return {
    top: rect.top,
    row: rect.height,
    end: marked[marked.length - 1].getBoundingClientRect().bottom,
    shown: marked.length,
  };
}

/** How many rows of the list right before `foot` fit between its head and
 *  the bottom of the box that scrolls, with `foot` kept under them; what
 *  whole rows leave is shared among them (`--m-fit-extra`, the table's rows
 *  add it), so the last row meets the footer. */
function measure(
  foot: HTMLElement,
  box: HTMLElement | null,
  cap = Infinity,
): (Fit & { n: number; shown: number }) | null {
  const list = foot.previousElementSibling as HTMLElement | null;
  // the row's own height: the share is taken off for the reading
  const share = list?.style.getPropertyValue('--m-fit-extra') ?? '';
  list?.style.setProperty('--m-fit-extra', '0px');
  const rows = firstRows(list);
  // under the last row, e.g. half a collapsed border: missed, a full fit
  // overflowed and showed a classic scrollbar
  const under =
    rows && list ? list.getBoundingClientRect().bottom - rows.end : 0;
  if (share) list?.style.setProperty('--m-fit-extra', share);
  else list?.style.removeProperty('--m-fit-extra');
  // a tab that is not shown keeps its footer mounted, with no size
  if (!rows || !rows.row || !foot.offsetHeight) return null;
  const { row } = rows;
  // the new-rows band comes and goes: counted, it would refetch the page and
  // drop itself
  const band = foot.parentElement?.querySelector<HTMLElement>(
    ':scope > .m-newrows',
  );
  rows.top -= band?.offsetHeight ?? 0;
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
  const room = bottom - top - under - foot.offsetHeight - tail;
  const n = Math.min(countOf(room, row), cap);
  const left = room - n * row;
  const extra = left > 0 ? Math.floor((left / n) * 100) / 100 : 0;
  // under half a pixel is the same share: a re-measure must not resize the
  // list, or every pass would fire the next one
  if (list && Math.abs(extra - (parseFloat(share) || 0)) >= 0.5)
    list.style.setProperty('--m-fit-extra', `${extra}px`);
  return {
    n,
    shown: rows.shown,
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
    // the count the list was given: read live, a new window height with the
    // same fit already counted as the new one and never refetched
    let count = getRowsPerPage(list);
    let resized = false;
    let left = 0; // the count before the last change
    let since = 0; // when the list last took a new count or new rows
    let shown = 0;
    const run = () => {
      if (resized) {
        resized = false;
        delete held[list];
        left = 0;
      }
      let fit = measure(el, box, held[list]);
      if (fit == null) return;
      const now = performance.now();
      if (fit.shown !== shown) {
        shown = fit.shown;
        since = now;
      }
      if (fit.n !== count) {
        // straight back to the count just left: the count moves what it is
        // measured against (a footer that wraps at "1–10" but not at "1–9", a
        // scrollbar that narrows the page and wraps its head), and each turn
        // refetched; the smaller one stays
        if (fit.n === left && now - since < 1000) {
          held[list] = Math.min(fit.n, count);
          fit = measure(el, box, held[list]) ?? fit;
        }
        left = count;
        since = now;
      }
      publishFit(list, fit);
      const next = getRowsPerPage(list);
      if (next !== count) {
        count = next;
        emit();
        changed();
      }
    };
    let timer = 0;
    const later = () => {
      window.clearTimeout(timer);
      // the menu took its new width in one frame: count inside that frame
      if (document.documentElement.hasAttribute('data-nav-instant'))
        flushSync(run);
      else timer = window.setTimeout(run, 150);
    };
    const onResize = () => {
      resized = true;
      later();
    };
    run();
    const ro = new ResizeObserver(later);
    ro.observe(el);
    ro.observe(box ?? document.documentElement);
    if (box) for (const child of Array.from(box.children)) ro.observe(child);
    window.addEventListener('resize', onResize);
    return () => {
      delete held[list];
      window.clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener('resize', onResize);
      (el.previousElementSibling as HTMLElement | null)?.style.removeProperty(
        '--m-fit-extra',
      );
    };
  }, [fitted, list]);
  return fitted;
}
