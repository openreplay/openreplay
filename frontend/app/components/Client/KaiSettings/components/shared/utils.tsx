import { Tag } from 'antd';
import { TFunction } from 'i18next';
import { LucideIcon, Monitor, Smartphone, Tablet } from 'lucide-react';
import React from 'react';

import { Resolution, Schedule, ScheduleFreq, TestLifecycle } from './types';

export const RESOLUTION_OPTIONS: { value: Resolution; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

// Device icons for the resolution segmented control (mirrors the heat-map device tabs).
export const RESOLUTION_ICON: Record<Resolution, LucideIcon> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

export const REGION_OPTIONS: { value: string; label: string; flag: string }[] =
  [
    { value: 'paris', label: 'Paris', flag: '🇫🇷' },
    { value: 'ny', label: 'New York', flag: '🇺🇸' },
    { value: 'sao-paulo', label: 'São Paulo', flag: '🇧🇷' },
  ];

export const resolutionLabel = (r?: Resolution): string =>
  RESOLUTION_OPTIONS.find((o) => o.value === r)?.label ?? 'Desktop';

export const regionLabel = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.label ?? 'Paris';

export const regionFlag = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.flag ?? '🇫🇷';

// Status chips reuse the app's antd <Tag> (same component as the Alerts list), tinted
// with the brand green/orange tokens via `variant="filled"` rather than antd's color
// presets. Draft stays neutral — the themed default gray Tag.
export const getStatusTag = (
  status: TestLifecycle,
  t: TFunction,
  className?: string,
) => {
  if (status === 'draft') {
    return (
      <Tag variant="filled" className={className}>
        {t('Draft')}
      </Tag>
    );
  }
  const cfg =
    status === 'active'
      ? {
          label: t('Active'),
          background: 'rgba(66, 174, 94, 0.12)', // brand green (#42AE5E) tint
          color: 'var(--color-green-dark)',
        }
      : {
          label: t('Paused'),
          background: 'rgba(226, 137, 64, 0.14)', // brand orange (#E28940) tint
          color: 'var(--color-orange-dark)',
        };
  return (
    <Tag
      variant="filled"
      className={className}
      style={{ background: cfg.background, color: cfg.color, border: 'none' }}
    >
      {cfg.label}
    </Tag>
  );
};

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, '0')}:00`;
  return { value, label: formatTime(value) };
});

export function formatTime(time: string): string {
  const [h] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_DAYS = [1, 2, 3, 4, 5];

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// Day-of-month options for the monthly schedule (1–28, plus "last day").
export const DOM_OPTIONS = [
  ...Array.from({ length: 28 }, (_, i) => ({
    value: i + 1,
    label: `the ${ordinal(i + 1)}`,
  })),
  { value: 0, label: 'the last day' },
];

// The frequency picker. "Custom…" falls back to the day-by-day chooser.
export const FREQ_OPTIONS: { value: ScheduleFreq | 'never'; label: string }[] =
  [
    { value: 'never', label: 'Never (manual only)' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom…' },
  ];

// Classify a stored schedule into a frequency, inferring it when `freq` is absent
// (mock data only carries days/time).
export const scheduleFreq = (s?: Schedule | null): ScheduleFreq | null => {
  if (!s) return null;
  if (s.freq) return s.freq;
  if (s.dayOfMonth != null) return 'monthly';
  if (!s.days || s.days.length === 0) return null;
  if (s.days.length === 7) return 'daily';
  if (s.days.length === 5 && WEEKDAY_DAYS.every((d) => s.days.includes(d)))
    return 'weekdays';
  if (s.days.length === 1) return 'weekly';
  return 'custom';
};

export const isScheduled = (s?: Schedule | null): boolean =>
  scheduleFreq(s) !== null;

const domLabel = (dom?: number): string =>
  dom === 0 ? 'the last day' : `the ${ordinal(dom ?? 1)}`;

export const scheduleLabel = (schedule?: Schedule | null): string => {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return 'Not scheduled';
  const at = formatTime(schedule.time);
  switch (freq) {
    case 'daily':
      return `Every day · ${at}`;
    case 'weekdays':
      return `Weekdays · ${at}`;
    case 'weekly':
      return `Every ${DAY_SHORT[schedule.days[0] ?? 1]} · ${at}`;
    case 'monthly':
      return `Monthly on ${domLabel(schedule.dayOfMonth)} · ${at}`;
    default:
      return `${[...schedule.days]
        .sort((a, b) => a - b)
        .map((d) => DAY_SHORT[d])
        .join(', ')} · ${at}`;
  }
};

// Short form for the table column (full label lives in the tooltip).
export const scheduleShort = (schedule?: Schedule | null): string => {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return 'Not scheduled';
  const at = formatTime(schedule.time);
  switch (freq) {
    case 'daily':
      return `Daily · ${at}`;
    case 'weekdays':
      return `Weekdays · ${at}`;
    case 'weekly':
      return `Weekly · ${at}`;
    case 'monthly':
      return `Monthly · ${at}`;
    default:
      return `${schedule.days.length} days · ${at}`;
  }
};

// Shared grid template so the Runs table's header and rows line up into real columns.
// Runs: Result · Test · Tags · Environment · Duration · When · Actions
export const RUNS_GRID =
  'grid items-center gap-3 grid-cols-[110px_minmax(160px,1fr)_140px_110px_80px_90px_72px]';

// Is this timestamp from the current calendar day?
export const isToday = (ts: number): boolean => dayBucket(ts) === 'Today';

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
};

// Groups a run timestamp into "Today" / "Yesterday" / "Mon D" for the runs log.
export const dayBucket = (ts: number): string => {
  const today = new Date(Date.now());
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  if (ts >= start) return 'Today';
  if (ts >= start - 86400000) return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

export const relativeTime = (ts?: number): string => {
  if (!ts) return '—';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};
