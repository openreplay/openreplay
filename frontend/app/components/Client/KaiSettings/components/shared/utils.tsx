import { Tag } from 'antd';
import { TFunction } from 'i18next';
import React from 'react';

import { Resolution, Schedule, TestLifecycle } from './types';

export const RESOLUTION_OPTIONS: { value: Resolution; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

export const REGION_OPTIONS = [
  { value: 'paris', label: 'Paris' },
  { value: 'ny', label: 'New York' },
  { value: 'sao-paulo', label: 'São Paulo' },
];

export const resolutionLabel = (r?: Resolution): string =>
  RESOLUTION_OPTIONS.find((o) => o.value === r)?.label ?? 'Desktop';

export const regionLabel = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.label ?? 'Paris';

export const getStatusTag = (status: TestLifecycle, t: TFunction) => {
  const config = {
    draft: { color: 'default', label: t('Draft') },
    active: { color: 'green', label: t('Active') },
    paused: { color: 'orange', label: t('Paused') },
  };

  const { color, label } = config[status];
  return <Tag color={color}>{label}</Tag>;
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

export const scheduleLabel = (schedule?: Schedule | null): string => {
  if (!schedule || schedule.days.length === 0) return 'Not scheduled';
  const days =
    schedule.days.length === 7
      ? 'Every day'
      : [...schedule.days]
          .sort((a, b) => a - b)
          .map((d) => DAY_SHORT[d])
          .join(', ');
  return `${days} · ${formatTime(schedule.time)}`;
};

// Short form for the table column (full label lives in the tooltip).
export const scheduleShort = (schedule?: Schedule | null): string => {
  if (!schedule || schedule.days.length === 0) return 'Not scheduled';
  if (schedule.days.length === 7) return `Daily · ${formatTime(schedule.time)}`;
  if (schedule.days.length === 5 && [1, 2, 3, 4, 5].every((d) => schedule.days.includes(d)))
    return `Weekdays · ${formatTime(schedule.time)}`;
  return `${schedule.days.length} days · ${formatTime(schedule.time)}`;
};

// Shared grid templates so each table's header and rows line up into real columns.
// Tests: Name · Tags · Environment · Schedule · Status · Actions
export const TESTS_GRID =
  'grid items-center gap-3 grid-cols-[minmax(160px,1fr)_150px_110px_150px_100px_104px]';
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
