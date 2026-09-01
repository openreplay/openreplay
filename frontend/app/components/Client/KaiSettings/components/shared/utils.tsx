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

// The API clamps list `limit` to 100. Every "fetch the whole set to resolve names /
// options" lookup in this feature uses that ceiling.
export const LOOKUP_LIMIT = 100;

// Brand tints shared by every status chip, banner and row wash in this feature, so the
// same state never renders at two different alphas. TINT = chips/banners, TINT_SOFT =
// full-row backgrounds (a chip alpha across a whole row reads far too heavy).
export const TINT = {
  red: 'rgba(204, 0, 0, 0.1)',
  green: 'rgba(66, 174, 94, 0.12)',
  indigo: 'rgba(97, 95, 255, 0.12)',
  blue: 'rgba(57, 78, 255, 0.1)',
  orange: 'rgba(226, 137, 64, 0.14)',
} as const;
export const TINT_SOFT = {
  red: 'rgba(204, 0, 0, 0.06)',
  green: 'rgba(66, 174, 94, 0.1)',
} as const;
// borders need more opacity than fills to stay visible
export const TINT_BORDER = { red: 'rgba(204, 0, 0, 0.35)' } as const;

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

// Values match the API's `config.regions` enum 1:1. `country` is an ISO code for the
// shared CountryFlagIcon; labels are place names, so they aren't translated.
export const REGION_OPTIONS: {
  value: string;
  label: string;
  country: string;
}[] = [
  { value: 'eu-central-1', label: 'Frankfurt', country: 'DE' },
  { value: 'us-east-1', label: 'N. Virginia', country: 'US' },
];

// `value` is a day count ('all' = no bound); `periodFrom` turns it into the RFC3339
// `from` the API takes (lower bound on createdAt/startedAt).
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

export const resolutionLabel = (t: TFunction, r?: Resolution): string =>
  t(RESOLUTION_OPTIONS.find((o) => o.value === r)?.label ?? 'Desktop');

export const regionLabel = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.label ?? r ?? '';

export const regionCountry = (r?: string): string =>
  REGION_OPTIONS.find((o) => o.value === r)?.country ?? 'DE';

// With Settings → "Pause tests on new revisions" on, a pending revision overrides the
// lifecycle: the test reads "Needs review" and its scheduled runs pause. With it off the
// test keeps its real status and the review is signalled by the blue dot only.
export type DisplayStatus = TestLifecycle | 'needs_review';

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
          background: TINT.green,
          color: 'var(--color-green-dark)',
        }
      : status === 'approved'
        ? {
            label: t('Approved'),
            background: TINT.indigo,
            color: 'var(--color-indigo)',
          }
        : status === 'needs_review'
          ? {
              label: t('Needs review'),
              background: TINT.blue,
              color: 'var(--color-main)',
            }
          : {
              label: t('Paused'),
              background: TINT.orange,
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

// Leading icon so the outcome reads without relying on colour alone.
export const getRunResult = (
  status: UiRunStatus,
  t: TFunction,
  className?: string,
) => {
  const cfg =
    status === 'running'
      ? {
          label: t('Running'),
          background: TINT.indigo,
          color: 'var(--color-indigo)',
          Icon: Loader,
          spin: true,
        }
      : status === 'failed'
        ? {
            label: t('Failed'),
            background: TINT.red,
            color: 'var(--color-red)',
            Icon: XCircle,
          }
        : {
            label: t('Passed'),
            background: TINT.green,
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

// Hidden below v2 — a version only becomes interesting once the steps have changed.
// `always` shows v1 too, for places comparing versions (the review's v1 → v2).
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

// First 2 tags shown, the rest folded into a +N hint.
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

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dayShort = (t: TFunction, d: number): string =>
  t(DAY_SHORT[d] ?? DAY_SHORT[0]);
// Single-letter pill label, derived from the translated short name.
export const dayInitial = (t: TFunction, d: number): string =>
  dayShort(t, d).charAt(0);

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

// 'custom' isn't offered: a non-preset cron round-trips as a read-only chip.
export const FREQ_OPTIONS: { value: ScheduleFreq | 'never'; label: string }[] =
  [
    { value: 'never', label: 'Never' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

// Infer the frequency from the day set when `freq` is absent. Custom is cron-based, so
// it is never inferable here.
const inferFreq = (s: Schedule): ScheduleFreq | null => {
  if (s.dayOfMonth != null) return 'monthly';
  if (!s.days || s.days.length === 0) return null;
  if (s.days.length === 7) return 'daily';
  if (s.days.length === 5 && WEEKDAY_DAYS.every((d) => s.days.includes(d)))
    return 'weekdays';
  return 'weekly';
};

// weekly with no day, or custom with no cron, reads as "not scheduled" so it never
// produces a malformed cron.
export const scheduleFreq = (s?: Schedule | null): ScheduleFreq | null => {
  if (!s) return null;
  const freq = s.freq ?? inferFreq(s);
  if (!freq) return null;
  if (freq === 'custom') return s.cron?.trim() ? 'custom' : null;
  if (freq === 'weekly' && !s.days?.length) return null;
  return freq;
};

// Structural check only — the backend validates fully. Blocks obvious garbage so we
// never persist an unparseable cron.
export const isValidCron = (cron?: string): boolean => {
  if (!cron) return false;
  const parts = cron.trim().split(/\s+/);
  return parts.length === 5 && parts.every((p) => /^[\d*/,\-lw?]+$/i.test(p));
};

export const isScheduled = (s?: Schedule | null): boolean =>
  scheduleFreq(s) !== null;

/** A test with no environment can't run — gates Resume until one is set. */
export const hasNoEnvironment = (tc: { environments?: string[] }): boolean =>
  !tc.environments || tc.environments.length === 0;

export const scheduleLabel = (
  t: TFunction,
  schedule?: Schedule | null,
): string => {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return t('Not scheduled');
  const at = formatTime(schedule.time);
  switch (freq) {
    case 'daily':
      return `${t('Every day')} · ${at}`;
    case 'weekdays':
      return `${t('Weekdays')} · ${at}`;
    case 'monthly':
      return schedule.dayOfMonth === 0
        ? `${t('Monthly on the last day')} · ${at}`
        : `${t('Monthly on the {{day}}', {
            day: ordinal(schedule.dayOfMonth ?? 1),
          })} · ${at}`;
    case 'custom':
      return `${t('Cron')} · ${schedule.cron}`;
    case 'weekly':
    default: {
      const days = [...schedule.days]
        .sort((a, b) => a - b)
        .map((d) => dayShort(t, d));
      return days.length > 1
        ? `${days.join(', ')} · ${at}`
        : `${t('Every {{day}}', { day: days[0] ?? dayShort(t, 1) })} · ${at}`;
    }
  }
};

/** Short form for the table column (the full label lives in the tooltip). */
export const scheduleShort = (
  t: TFunction,
  schedule?: Schedule | null,
): string => {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return t('Not scheduled');
  const at = formatTime(schedule.time);
  switch (freq) {
    case 'daily':
      return `${t('Daily')} · ${at}`;
    case 'weekdays':
      return `${t('Weekdays')} · ${at}`;
    case 'weekly':
      return `${t('Weekly')} · ${at}`;
    case 'monthly':
      return `${t('Monthly')} · ${at}`;
    case 'custom':
      return t('Custom');
    default:
      return `${t('{{count}} days', { count: schedule.days.length })} · ${at}`;
  }
};

// The runner's result blob often ends in a "Summary: …" section; show only that when
// present, otherwise the full text.
export const resultSummary = (text?: string): string | undefined => {
  if (!text) return text;
  const m = text.match(/^\s*summary:\s*([\s\S]*)$/im);
  return (m ? m[1] : text).trim();
};

export const formatDuration = (ms: number): string => {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const relativeTime = (t: TFunction, ts?: number): string => {
  if (!ts) return '—';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return t('just now');
  if (mins < 60) return t('{{n}}m ago', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('{{n}}h ago', { n: hours });
  return t('{{n}}d ago', { n: Math.round(hours / 24) });
};

// ---- Schedule <-> cron ----
// The API stores schedules as standard 5-field cron strings; the Schedule object the UI
// edits round-trips through cron.

// Parse a cron day-of-week field into weekday numbers (0–6), or null if it isn't a plain
// list/range of single digits (steps, names, etc. → handled as custom).
const parseDow = (dow: string): number[] | null => {
  const out: number[] = [];
  for (const token of dow.split(',')) {
    const range = token.match(/^(\d)-(\d)$/);
    if (range) {
      const [, a, b] = range.map(Number);
      if (a > b) return null;
      for (let d = a; d <= b; d += 1) out.push(d);
    } else if (/^\d$/.test(token)) {
      out.push(Number(token));
    } else {
      return null;
    }
  }
  return out.every((d) => d >= 0 && d <= 6) ? Array.from(new Set(out)) : null;
};

export function cronToSchedule(cron?: string | null): Schedule | null {
  if (!cron) return null;
  const raw = cron.trim();
  const parts = raw.split(/\s+/);
  if (parts.length < 5) return null;
  const [min, hour, dom, mon, dow] = parts;
  const h = Number(hour);
  const m = Number(min);
  // presets need a simple HH:MM and every-month; anything else is a raw custom cron
  const simpleTime =
    /^\d+$/.test(min) && /^\d+$/.test(hour) && h <= 23 && m <= 59;
  const time = simpleTime
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    : '09:00';
  const custom: Schedule = { freq: 'custom', days: [], time, cron: raw };

  if (mon !== '*' || !simpleTime) return custom;

  // Monthly — a concrete day-of-month, no weekday constraint.
  if ((dow === '*' || dow === '?') && dom !== '*' && dom !== '?') {
    if (/^\d+$/.test(dom)) {
      const d = Number(dom);
      if (d >= 1 && d <= 31)
        return { freq: 'monthly', days: [], dayOfMonth: d, time };
    }
    return custom;
  }

  // Day-of-week schedule. No explicit freq: inferFreq classifies the day set
  // (daily / weekdays / weekly) so the pills round-trip.
  if (dom === '*' || dom === '?') {
    if (dow === '*' || dow === '?') return { days: ALL_DAYS, time };
    const days = parseDow(dow);
    if (days && days.length) return { days, time };
  }

  return custom;
}

export function scheduleToCron(schedule?: Schedule | null): string | null {
  const freq = scheduleFreq(schedule);
  if (!freq || !schedule) return null;
  if (freq === 'custom')
    return isValidCron(schedule.cron) ? (schedule.cron as string).trim() : null;
  const [h, m] = schedule.time.split(':').map(Number);
  switch (freq) {
    case 'daily':
      return `${m} ${h} * * *`;
    case 'weekdays':
      return `${m} ${h} * * 1-5`;
    case 'monthly':
      return `${m} ${h} ${schedule.dayOfMonth || 1} * *`;
    case 'weekly':
    default:
      return `${m} ${h} * * ${[...schedule.days].sort((a, b) => a - b).join(',')}`;
  }
}

/** The API stores `steps` as free-form JSON; the UI works with a flat string list. */
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
