import { Tag } from 'antd';
import { TFunction } from 'i18next';
import React from 'react';

import { RunStatus, TestStatus } from './types';

export const getStatusTag = (status: TestStatus, t: TFunction) => {
  const config: Record<TestStatus, { color: string; label: string }> = {
    pending: { color: 'orange', label: t('Pending Review') },
    approved: { color: 'green', label: t('Approved') },
    rejected: { color: 'red', label: t('Rejected') },
    paused: { color: 'default', label: t('Paused') },
  };

  const { color, label } = config[status];
  return <Tag color={color}>{label}</Tag>;
};

export const getRunStatusTag = (status: RunStatus, t: TFunction) => {
  const config: Record<RunStatus, { color: string; label: string }> = {
    dispatched: { color: 'processing', label: t('Running') },
    passed: { color: 'green', label: t('Passed') },
    failed: { color: 'red', label: t('Failed') },
    error: { color: 'red', label: t('Error') },
    timeout: { color: 'volcano', label: t('Timeout') },
  };

  const { color, label } = config[status];
  return <Tag color={color}>{label}</Tag>;
};

export const formatDuration = (ms: number): string => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
};

// ---- Run cadence <-> cron ----
// The backend stores schedules as standard 5-field cron strings. The UI only
// offers a few coarse cadences, so we bucket an arbitrary cron into one of them
// on read, and rebuild a cron on write (preserving the existing time of day).

export type Frequency = 'day' | 'week' | '2weeks' | 'month';

export const DEFAULT_FREQUENCY: Frequency = 'week';

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: '2weeks', label: '2 Weeks' },
  { value: 'month', label: 'Month' },
];

/** Bucket a cron string into one of the UI cadence options. */
export const cronToFrequency = (cron?: string | null): Frequency => {
  if (!cron) return DEFAULT_FREQUENCY;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return DEFAULT_FREQUENCY;
  const [, , dayOfMonth, , dayOfWeek] = parts;
  // A specific weekday -> weekly.
  if (dayOfWeek !== '*' && dayOfWeek !== '?') return 'week';
  // Multiple / stepped days of month -> bi-weekly.
  if (dayOfMonth.includes(',') || dayOfMonth.includes('/')) return '2weeks';
  // A single day of month -> monthly.
  if (dayOfMonth !== '*' && dayOfMonth !== '?') return 'month';
  return 'day';
};

/**
 * Build a cron for a cadence, preserving the minute/hour of an existing cron so
 * we don't reset the configured time of day. Defaults to 09:00.
 */
export const frequencyToCron = (
  freq: Frequency,
  baseCron?: string | null,
): string => {
  let minute = '0';
  let hour = '9';
  if (baseCron) {
    const parts = baseCron.trim().split(/\s+/);
    if (parts.length >= 2) {
      [minute, hour] = parts;
    }
  }
  switch (freq) {
    case 'day':
      return `${minute} ${hour} * * *`;
    case '2weeks':
      return `${minute} ${hour} 1,15 * *`;
    case 'month':
      return `${minute} ${hour} 1 * *`;
    case 'week':
    default:
      return `${minute} ${hour} * * 1`;
  }
};

/**
 * The API stores test `steps` as free-form JSON. The UI works with a flat list
 * of step strings (one per line), so normalise whatever shape we get back.
 */
export const stepsToLines = (steps: unknown): string[] => {
  if (!steps) return [];
  if (Array.isArray(steps)) {
    return steps.map((s) => (typeof s === 'string' ? s : JSON.stringify(s)));
  }
  if (typeof steps === 'string') {
    return steps.split('\n').filter((line) => line.trim() !== '');
  }
  return [JSON.stringify(steps)];
};
