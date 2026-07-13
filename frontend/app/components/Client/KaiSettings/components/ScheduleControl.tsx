import { InputNumber, Select } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Schedule, ScheduleFreq } from './shared/types';
import {
  ALL_DAYS,
  DAY_LABELS,
  FREQ_OPTIONS,
  TIME_OPTIONS,
  WEEKDAY_DAYS,
  ordinal,
  scheduleFreq,
  scheduleLabel,
} from './shared/utils';

interface Props {
  value?: Schedule | null;
  onChange: (s: Schedule | null) => void;
}

/** Frequency-first scheduler: Never / Daily / Weekdays / Weekly / Monthly. Daily / Weekdays
 *  / Weekly share the day-of-week circles (multi-select); Monthly picks a day-of-month.
 *  Holds its own working state so the controls update instantly — the drawer persists each
 *  change through the server, and a purely controlled value would snap back during that
 *  round-trip. Seeded per mount (the drawer remounts this per test), then local-authoritative.
 *  A non-preset cron (should one ever exist) has no picker option — it shows read-only so
 *  it isn't silently overwritten. */
function ScheduleControl({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [sched, setSched] = useState<Schedule | null>(() => value ?? null);

  const freq = scheduleFreq(sched);
  const time = sched?.time ?? '09:00';
  const showDays =
    freq === 'daily' || freq === 'weekdays' || freq === 'weekly';

  // update local state (instant) + notify the parent to persist
  const update = (s: Schedule | null) => {
    setSched(s);
    onChange(s);
  };

  // Build a fresh schedule for the chosen frequency. Day-based freqs carry only the day set
  // (no explicit `freq`) so the pills stay the source of truth and the frequency is inferred
  // from them — toggling days reclassifies daily ⇄ weekdays ⇄ weekly automatically.
  const setFreq = (f: ScheduleFreq | 'never') => {
    if (f === 'never') return update(null);
    if (f === 'daily') return update({ days: ALL_DAYS, time });
    if (f === 'weekdays') return update({ days: WEEKDAY_DAYS, time });
    if (f === 'weekly') return update({ days: [sched?.days?.[0] ?? 1], time });
    if (f === 'monthly')
      return update({
        freq: f,
        days: [],
        dayOfMonth: sched?.dayOfMonth ?? 1,
        time,
      });
    // 'custom' isn't offered — re-selecting the read-only legacy chip is a no-op
  };

  const setTime = (newTime: string) =>
    update({ ...(sched as Schedule), time: newTime });

  // toggle a day in the pill picker (multi-select); at least one day stays selected
  const pickDay = (d: number) => {
    const days = sched?.days?.includes(d)
      ? (sched.days ?? []).filter((x) => x !== d)
      : [...(sched?.days ?? []), d];
    if (!days.length) return;
    update({ ...(sched as Schedule), days });
  };

  // custom isn't a pickable frequency; surface it only when a legacy non-preset cron is
  // already set, so the picker can show it (read-only) instead of a blank value.
  const options = FREQ_OPTIONS.map((o) => ({ ...o, label: t(o.label) }));
  if (freq === 'custom') options.push({ value: 'custom', label: t('Custom') });

  const TimeSelect = (
    <span className="flex items-center gap-2">
      <span className="text-sm text-disabled-text">{t('at')}</span>
      <Select
        size="small"
        value={time}
        options={TIME_OPTIONS}
        style={{ width: 110 }}
        onChange={setTime}
      />
    </span>
  );

  // Everything on one wrapping line: frequency, then its day picker (daily/weekdays/weekly)
  // or day-of-month (monthly), then the time — to spare vertical space.
  return (
    <div className="flex items-center gap-x-2 gap-y-2 flex-wrap">
      <Select
        size="small"
        value={freq ?? 'never'}
        options={options}
        style={{ width: 124 }}
        onChange={setFreq}
      />

      {freq === 'monthly' && (
        <span className="flex items-center gap-2">
          <span className="text-sm text-disabled-text">{t('on every')}</span>
          <InputNumber
            size="small"
            min={1}
            max={31}
            precision={0}
            value={sched?.dayOfMonth ?? 1}
            // show the ordinal (1st / 2nd / 19th); strip the suffix back to a number
            formatter={(v) => (v && Number(v) >= 1 ? ordinal(Number(v)) : '')}
            parser={(display) => Number((display ?? '').replace(/\D/g, ''))}
            style={{ width: 72 }}
            onChange={(v) =>
              update({
                ...(sched as Schedule),
                dayOfMonth: Math.min(
                  31,
                  Math.max(1, Math.round(Number(v) || 1)),
                ),
              })
            }
          />
        </span>
      )}

      {/* day-of-week circles — the shared picker for daily / weekdays / weekly (multi-select) */}
      {showDays && (
        <span className="flex items-center gap-1">
          {DAY_LABELS.map((label, d) => {
            const on = sched?.days?.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => pickDay(d)}
                className={`w-6 h-6 rounded-full text-xs border transition-colors ${
                  on
                    ? 'bg-active-blue border-active-blue-border text-blue'
                    : 'border-gray-light text-disabled-text hover:border-gray-medium'
                }`}
              >
                {label}
              </button>
            );
          })}
        </span>
      )}

      {/* legacy non-preset cron — read-only (no picker option to create one) */}
      {freq === 'custom' && (
        <span className="text-xs font-mono text-disabled-text">
          {sched?.cron}
        </span>
      )}

      {freq && freq !== 'custom' && TimeSelect}

      {/* plain-language confirmation of the resolved schedule */}
      {freq && freq !== 'custom' && (
        <span className="text-xs text-disabled-text">
          {scheduleLabel(sched)}
        </span>
      )}
    </div>
  );
}

export default ScheduleControl;
