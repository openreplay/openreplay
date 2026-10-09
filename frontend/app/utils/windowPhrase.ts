import type { TFunction } from 'i18next';
import { DateTime } from 'luxon';

import {
  CUSTOM_RANGE,
  DATE_RANGE_OPTIONS,
  LONG_DATE_RANGE_OPTIONS,
} from 'App/dateRange';

export interface WindowLike {
  rangeName?: string;
  start?: number;
  end?: number;
}

/** The presets an empty page can widen to, smallest first. */
export const WIDEN_PRESETS = [
  { value: 'LAST_24_HOURS', label: 'Past 24 Hours', ms: 24 * 3600_000 },
  { value: 'LAST_7_DAYS', label: 'Past 7 Days', ms: 7 * 86400_000 },
  { value: 'LAST_30_DAYS', label: 'Past 30 Days', ms: 30 * 86400_000 },
] as const;

/** The smallest preset whose window reaches a moment, if any does. */
export const presetReaching = (at: number, now = Date.now()) =>
  WIDEN_PRESETS.find((p) => now - p.ms <= at) ?? null;

/**
 * The window as the tail of a sentence about what is not in it: "in the past
 * 24 hours", "between Jan 1 and Jan 2, 2025", "since Jan 1". A preset is
 * named; a custom range is spelled, a year said once, at the end.
 */
export function windowPhrase(t: TFunction, w: WindowLike, now = Date.now()) {
  const preset = [...DATE_RANGE_OPTIONS, ...LONG_DATE_RANGE_OPTIONS].find(
    (o) => o.value === w.rangeName,
  );
  if (preset && w.rangeName !== CUSTOM_RANGE) {
    return t('in the {{window}}', { window: t(preset.label).toLowerCase() });
  }
  // years in the app's zone, the one the dates are written in
  const yearOf = (ms: number) => DateTime.fromMillis(ms).year;
  const year = yearOf(now);
  const day = (ms: number, withYear: boolean) =>
    DateTime.fromMillis(ms).toFormat(withYear ? 'LLL d, yyyy' : 'LLL d');
  const { start, end } = w;
  const otherYear = [start, end].some(
    (ms) => ms != null && yearOf(ms) !== year,
  );
  if (start != null && end != null) {
    const sameYear = yearOf(start) === yearOf(end);
    return t('between {{from}} and {{to}}', {
      from: day(start, otherYear && !sameYear),
      to: day(end, otherYear),
    });
  }
  if (start != null)
    return t('since {{from}}', { from: day(start, otherYear) });
  if (end != null) return t('up to {{to}}', { to: day(end, otherYear) });
  return t('in this window');
}
