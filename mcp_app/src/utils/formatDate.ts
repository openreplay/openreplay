// Render an ISO date (YYYY-MM-DD) in the user's locale, e.g. "May 4, 2026".
// Falls back to the raw input when parsing fails so we never show "Invalid Date".
export function formatDateRange(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  const s = formatOne(start);
  const e = formatOne(end);
  return `${s} — ${e}`;
}

function formatOne(iso: string): string {
  // YYYY-MM-DD strings parse as UTC midnight, which can shift a day in
  // negative-offset locales. Construct with local components to avoid that.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  const d = m
    ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    : new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
