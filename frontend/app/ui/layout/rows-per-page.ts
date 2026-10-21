import { useSyncExternalStore } from 'react';

/** One rows-per-page choice for every paged list, remembered. */
export const ROWS_OPTIONS = [10, 50, 100] as const;
export type RowsPerPage = (typeof ROWS_OPTIONS)[number];
export const DEFAULT_ROWS: RowsPerPage = 10;

const KEY = '__or_rows_per_page';
const listeners = new Set<() => void>();

function read(): RowsPerPage {
  try {
    const n = Number(localStorage.getItem(KEY));
    return (ROWS_OPTIONS as readonly number[]).includes(n)
      ? (n as RowsPerPage)
      : DEFAULT_ROWS;
  } catch {
    return DEFAULT_ROWS;
  }
}

let current: RowsPerPage = read();

export function getRowsPerPage(): RowsPerPage {
  return current;
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
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => current,
  );
}
