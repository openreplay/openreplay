import { useSyncExternalStore } from 'react';

/** One rows-per-page choice for every paged list, remembered. */
export const ROWS_OPTIONS = [10, 25, 50, 100] as const;
export type RowsPerPage = (typeof ROWS_OPTIONS)[number];
export const DEFAULT_ROWS: RowsPerPage = 10;

const KEY = '__or_rows_per_page';
// what Sessions spends around its rows: header, filters, table head, footer
const LIST_CHROME = 290;
const listeners = new Set<() => void>();

function stored(): RowsPerPage | null {
  try {
    const n = Number(localStorage.getItem(KEY));
    return (ROWS_OPTIONS as readonly number[]).includes(n)
      ? (n as RowsPerPage)
      : null;
  } catch {
    return null;
  }
}

// no choice made yet: the smallest of 10 / 25 / 50 that fills the window,
// so a tall screen never ends a short list halfway down
function byHeight(): RowsPerPage {
  const root = getComputedStyle(document.documentElement);
  const rem = parseFloat(root.fontSize) || 16;
  const row =
    (parseFloat(root.getPropertyValue('--m-list-row-height')) || 3.5) * rem +
    1;
  const fits = Math.floor((window.innerHeight - LIST_CHROME) / row);
  return ([10, 25, 50] as const).find((n) => n >= fits) ?? 50;
}

let current: RowsPerPage | undefined;

export function getRowsPerPage(): RowsPerPage {
  return (current ??= stored() ?? byHeight());
}

export function setRowsPerPage(n: RowsPerPage) {
  if (n === current) return;
  current = n;
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    // private mode: the choice lasts for the page
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export function useRowsPerPage(): RowsPerPage {
  return useSyncExternalStore(subscribe, getRowsPerPage, getRowsPerPage);
}
