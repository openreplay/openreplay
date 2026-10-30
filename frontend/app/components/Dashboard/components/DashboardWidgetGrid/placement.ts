import { HEATMAP } from 'App/constants/card';

interface Placed {
  metricType?: string;
  config?: { col?: number };
}

/** Two columns: a widget is a half (one column) or full (both). Legacy widgets
    store a 1-4 column count; 3 and 4 read as full. */
export const isFullWidget = (w: Placed) => (w.config?.col ?? 4) >= 3;

/** A heatmap stands two rows tall: the page needs the height. */
export const isTallWidget = (w: Placed) => w.metricType === HEATMAP;

/**
 * Halves drawn full: the grid fills with dense flow, so a half with no other
 * half to share its row would leave a hole. Simulates that placement in
 * one-row cells and returns the halves left alone (they stay halves in the
 * saved config). A tall half takes two cells of its column and never
 * stretches: it was made narrow to stand beside the others.
 */
export function loneHalves<T extends Placed>(widgets: readonly T[]): Set<T> {
  const cells: T[][] = [];
  const fits = (row: number, col: number, rows: number) =>
    Array.from({ length: rows }, (_, i) => !cells[row + i]?.[col]).every(
      Boolean,
    );
  const put = (w: T, row: number, col: number, rows: number) => {
    for (let i = 0; i < rows; i++) (cells[row + i] ??= [])[col] = w;
  };

  for (const w of widgets) {
    const rows = isTallWidget(w) ? 2 : 1;
    for (let row = 0; ; row++) {
      if (isFullWidget(w)) {
        if (!fits(row, 0, rows) || !fits(row, 1, rows)) continue;
        put(w, row, 0, rows);
        put(w, row, 1, rows);
        break;
      }
      const col = [0, 1].find((c) => fits(row, c, rows));
      if (col === undefined) continue;
      put(w, row, col, rows);
      break;
    }
  }

  const lone = new Set<T>();
  for (const [left, right] of cells) {
    const alone = left && right ? undefined : (left ?? right);
    if (alone && !isTallWidget(alone)) lone.add(alone);
  }
  return lone;
}
