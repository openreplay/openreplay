import { Tag, Tooltip } from 'antd';
import { TFunction } from 'i18next';
import {
  CheckCircle2,
  Loader,
  LucideIcon,
  Monitor,
  Smartphone,
  Tablet,
  XCircle,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Resolution,
  Schedule,
  ScheduleFreq,
  TestCase,
  TestLifecycle,
  UiRunStatus,
} from './types';

export const RESOLUTION_OPTIONS: { value: Resolution; label: string }[] = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'mobile', label: 'Mobile' },
];

export const RESOLUTION_ICON: Record<Resolution, LucideIcon> = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

// The API stores regions as a strict enum (`config.regions`); values here match it 1:1.
// `country` is an ISO code for the shared CountryFlagIcon (country-flag-icons).
export const REGION_OPTIONS: {
  value: string;
  label: string;
  country: string;
}[] = [
  { value: 'eu-central-1', label: 'Frankfurt', country: 'DE' },
  { value: 'us-east-1', label: 'N. Virginia', country: 'US' },
];

// Preset date ranges for the list filters. `value` is a day count ('all' = no bound);
// `periodFrom` turns it into the RFC3339 `from` the API takes (lower bound on
// createdAt/startedAt). Presets keep it a one-click Select — no date-picker dependency.
export const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '1', label: 'Last 24h' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];
export const periodFrom = (value: string): string | undefined =>
  value === 'all'
    ? undefined
    : new Date(Date.now() - Number(value) * 86400000).toISOString();

export const resolutionLabel = (r?: Resolution): string =>
  RESOLUTION_OPTIONS.find((o) => o.value === r)?.label ?? 'Desktop';

export const regionLabel = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.label ?? r ?? '';

export const regionCountry = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.country ?? 'DE';

// What the table shows as the status. When Settings → "Pause tests on new
// revisions" is on, a pending revision overrides the lifecycle: the test reads
// "Needs review" and its scheduled runs pause until the proposed version is
// reviewed. With the setting off, the test keeps its real status (and keeps
// running) — the review is signalled by the blue dot and the Needs review tab.
export type DisplayStatus = TestLifecycle | 'needs_review';

export const displayStatus = (
  tc: TestCase,
  reviewPauses = true,
): DisplayStatus =>
  tc.pendingRevision && reviewPauses ? 'needs_review' : tc.status;

// Status chip for the tests table — a filled <Tag> tinted with brand tokens. Draft
// stays neutral; approved indigo (idle), active green, paused orange, needs-review blue.
export const getStatusTag = (
  status: DisplayStatus,
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
          background: 'rgba(66, 174, 94, 0.12)',
          color: 'var(--color-green-dark)',
        }
      : status === 'approved'
        ? {
            label: t('Approved'),
            background: 'rgba(97, 95, 255, 0.12)',
            color: 'var(--color-indigo)',
          }
        : status === 'needs_review'
          ? {
              // brand blue — same language as the "new draft" dot: something new
              // from the agent is waiting for the user
              label: t('Needs review'),
              background: 'rgba(57, 78, 255, 0.1)',
              color: 'var(--color-main)',
            }
          : {
              label: t('Paused'),
              background: 'rgba(226, 137, 64, 0.14)',
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

// Run result chip — matches getStatusTag's brand-tint style plus a leading icon so the
// outcome reads without relying on colour alone.
export const getRunResult = (
  status: UiRunStatus,
  t: TFunction,
  className?: string,
) => {
  const cfg =
    status === 'running'
      ? {
          label: t('Running'),
          background: 'rgba(97, 95, 255, 0.12)',
          color: 'var(--color-indigo)',
          Icon: Loader,
          spin: true,
        }
      : status === 'failed'
        ? {
            label: t('Failed'),
            background: 'rgba(204, 0, 0, 0.1)',
            color: 'var(--color-red)',
            Icon: XCircle,
          }
        : {
            label: t('Passed'),
            background: 'rgba(66, 174, 94, 0.12)',
            color: 'var(--color-green-dark)',
            Icon: CheckCircle2,
          };
  const { Icon } = cfg;
  return (
    <Tag
      variant="filled"
      className={className}
      style={{ background: cfg.background, color: cfg.color, border: 'none' }}
    >
      <span className="inline-flex items-center gap-1">
        <Icon size={12} className={cfg.spin ? 'animate-spin' : ''} />
        {cfg.label}
      </span>
    </Tag>
  );
};

// Muted version tag next to a test's title — only from v2 up ("v1" everywhere would
// be noise; a version only becomes interesting once the steps have actually changed).
// `always` shows v1 too — for places comparing versions (the review's v1 → v2).
export const VersionLabel = ({
  version,
  always,
}: {
  version?: number;
  always?: boolean;
}) => {
  if (!version || (!always && version < 2)) return null;
  return (
    <span
      className="shrink-0 text-xs leading-none text-gray-medium border rounded px-1 py-0.5 font-medium"
      style={{ borderColor: 'var(--color-gray-light)' }}
    >
      v{version}
    </span>
  );
};

// Compact tag chips for a table cell: first 2 shown, the rest folded into a +N hint.
// Empty reads italic "Not set" — same language as the environment/schedule gaps.
export const RowTags = ({ tags }: { tags?: string[] }) => {
  const { t } = useTranslation();
  if (!tags || tags.length === 0)
    return <span className="text-disabled-text italic">{t('Not set')}</span>;
  const shown = tags.slice(0, 2);
  const rest = tags.slice(2);
  return (
    <div className="flex items-center gap-1 overflow-hidden">
      {shown.map((tag) => (
        <span
          key={tag}
          className="text-xs px-2 py-0.5 rounded border whitespace-nowrap bg-gray-lightest text-gray-dark"
          style={{ borderColor: 'var(--color-gray-light)' }}
        >
          {tag}
        </span>
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.join(', ')}>
          <span className="text-xs text-gray-medium shrink-0 cursor-default">
            +{rest.length}
          </span>
        </Tooltip>
      )}
    </div>
  );
};

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function formatTime(time: string): string {
  const [h, m = 0] = time.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, '0')}:00`;
  return { value, label: formatTime(value) };
});

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
    { value: 'never', label: 'Never' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom…' },
  ];

// Infer the frequency from a schedule's days/dayOfMonth when `freq` is absent.
const inferFreq = (s: Schedule): ScheduleFreq | null => {
  if (s.dayOfMonth != null) return 'monthly';
  if (!s.days || s.days.length === 0) return null;
  if (s.days.length === 7) return 'daily';
  if (s.days.length === 5 && WEEKDAY_DAYS.every((d) => s.days.includes(d)))
    return 'weekdays';
  if (s.days.length === 1) return 'weekly';
  return 'custom';
};

// Classify a schedule into a frequency. A day-based frequency (weekly/custom) with no
// days selected is treated as "not scheduled" so it never produces a malformed cron.
export const scheduleFreq = (s?: Schedule | null): ScheduleFreq | null => {
  if (!s) return null;
  const freq = s.freq ?? inferFreq(s);
  if (!freq) return null;
  if ((freq === 'weekly' || freq === 'custom') && !s.days?.length) return null;
  return freq;
};

export const isScheduled = (s?: Schedule | null): boolean =>
  scheduleFreq(s) !== null;

/** A test with no environment can't run — gates Resume until one is set. */
export const hasNoEnvironment = (tc: { environments?: string[] }): boolean =>
  !tc.environments || tc.environments.length === 0;

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

export const formatDuration = (ms: number): string => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
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

// ---- Schedule <-> cron ----
// The API stores schedules as standard 5-field cron strings. The Schedule object the
// UI edits round-trips through cron so a schedule persists as a `cron` on the test.

export function cronToSchedule(cron?: string | null): Schedule | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return null;
  const [min, hour, dom, , dow] = parts;
  const h = Number(hour);
  const m = Number(min);
  const time =
    Number.isFinite(h) && Number.isFinite(m)
      ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      : '09:00';

  // Monthly — a concrete day-of-month with no weekday constraint.
  if (dom !== '*' && dom !== '?' && (dow === '*' || dow === '?')) {
    const dayOfMonth =
      dom.toUpperCase() === 'L' ? 0 : Number(dom.split(',')[0]) || 1;
    return { freq: 'monthly', days: [], dayOfMonth, time };
  }

  if (dow === '*' || dow === '?')
    return { freq: 'daily', days: ALL_DAYS, time };

  const days = dow
    .split(',')
    .flatMap((token) => {
      const range = token.match(/^(\d)-(\d)$/);
      if (range) {
        const [, a, b] = range.map(Number);
        return Array.from({ length: b - a + 1 }, (_, i) => a + i);
      }
      return [Number(token)];
    })
    .filter((d) => Number.isFinite(d) && d >= 0 && d <= 6);

  if (days.length === 0) return { freq: 'daily', days: ALL_DAYS, time };
  return { days, time, freq: scheduleFreq({ days, time }) ?? 'custom' };
}

export function scheduleToCron(schedule?: Schedule | null): string | null {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return null;
  const [h, m] = schedule.time.split(':').map(Number);
  switch (freq) {
    case 'daily':
      return `${m} ${h} * * *`;
    case 'weekdays':
      return `${m} ${h} * * 1-5`;
    case 'monthly':
      return `${m} ${h} ${schedule.dayOfMonth === 0 ? 'L' : (schedule.dayOfMonth ?? 1)} * *`;
    case 'weekly':
    default:
      return `${m} ${h} * * ${[...schedule.days].sort((a, b) => a - b).join(',')}`;
  }
}

/**
 * The API stores test `steps` as free-form JSON. The UI works with a flat list of
 * step strings, so normalise whatever shape we get back.
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
