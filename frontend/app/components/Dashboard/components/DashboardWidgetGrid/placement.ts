/** Two columns: a widget is a half (one column) or full (both). Legacy widgets
    store a 1-4 column count; 3 and 4 read as full. */
export const isFullWidget = (w: { config?: { col?: number } }) =>
  (w.config?.col ?? 4) >= 3;

/**
 * Halves drawn full: the grid fills with dense flow, so a half with no other
 * half to share its row would leave a hole. Simulates that placement and
 * returns the halves left alone (they stay halves in the saved config).
 */
export function loneHalves<T extends { config?: { col?: number } }>(
  widgets: readonly T[],
): Set<T> {
  const rows: T[][] = [];
  for (const w of widgets) {
    if (isFullWidget(w)) {
      rows.push([w]);
      continue;
    }
    const open = rows.find((r) => r.length === 1 && !isFullWidget(r[0]));
    if (open) open.push(w);
    else rows.push([w]);
  }
  return new Set(
    rows.filter((r) => r.length === 1 && !isFullWidget(r[0])).map((r) => r[0]),
  );
}
