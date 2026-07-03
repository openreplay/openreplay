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

import {
  Resolution,
  RunStatus,
  Schedule,
  ScheduleFreq,
  TestCase,
  TestLifecycle,
} from './types';

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

// `country` is an ISO code for the app's standard CountryFlagIcon (country-flag-icons).
export const REGION_OPTIONS: {
  value: string;
  label: string;
  country: string;
}[] = [
  { value: 'paris', label: 'Paris', country: 'FR' },
  { value: 'ny', label: 'New York', country: 'US' },
  { value: 'sao-paulo', label: 'São Paulo', country: 'BR' },
];

export const resolutionLabel = (r?: Resolution): string =>
  RESOLUTION_OPTIONS.find((o) => o.value === r)?.label ?? 'Desktop';

export const regionLabel = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.label ?? 'Paris';

export const regionCountry = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.country ?? 'FR';

// What the table shows as the status. A pending step revision overrides the
// lifecycle: the test reads "Needs review" (and its scheduled runs pause) until the
// proposed version is reviewed — then it falls back to its real lifecycle status.
export type DisplayStatus = TestLifecycle | 'needs_review';

export const displayStatus = (tc: TestCase): DisplayStatus =>
  tc.pendingRevision ? 'needs_review' : tc.status;

// Status chips reuse the app's antd <Tag> (same component as the Alerts list), tinted
// with the brand green/orange tokens via `variant="filled"` rather than antd's color
// presets. Draft stays neutral — the themed default gray Tag.
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
          background: 'rgba(66, 174, 94, 0.12)', // brand green (#42AE5E) tint
          color: 'var(--color-green-dark)',
        }
      : status === 'approved'
        ? {
            // indigo — approved but idle (no schedule yet), distinct from green Active
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

// Run result chip — a filled <Tag> in the same brand-tint style as getStatusTag (the
// tests' Status column), plus a leading icon so the outcome reads without relying on
// colour alone. Keeps the two tables' status language identical.
export const getRunResult = (
  status: RunStatus,
  t: TFunction,
  className?: string,
) => {
  const cfg =
    status === 'running'
      ? {
          label: t('Running'),
          background: 'rgba(97, 95, 255, 0.12)', // indigo tint
          color: 'var(--color-indigo)',
          Icon: Loader,
          spin: true,
        }
      : status === 'failed'
        ? {
            label: t('Failed'),
            background: 'rgba(204, 0, 0, 0.1)', // brand red tint
            color: 'var(--color-red)',
            Icon: XCircle,
          }
        : {
            label: t('Passed'),
            background: 'rgba(66, 174, 94, 0.12)', // brand green tint
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
export const VersionLabel = ({ version }: { version?: number }) => {
  if (!version || version < 2) return null;
  return (
    <span
      className="shrink-0 text-xs leading-none text-gray-medium border rounded px-1 py-0.5 font-medium"
      style={{ borderColor: 'var(--color-gray-light)' }}
    >
      V{version}
    </span>
  );
};

// Compact tag chips for a table cell: first 2 shown, the rest folded into a +N hint.
// Empty reads italic "Not set" — same language as the environment/schedule gaps.
export const RowTags = ({ tags }: { tags?: string[] }) => {
  if (!tags || tags.length === 0)
    return <span className="text-disabled-text italic">Not set</span>;
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
    { value: 'never', label: 'Never' },
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
