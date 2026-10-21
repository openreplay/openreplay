import { SimpleSelect } from '@/ui/inputs/select';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Schedule, ScheduleFreq } from './shared/types';
import {
  ALL_DAYS,
  DAY_SHORT,
  FREQ_OPTIONS,
  TIME_OPTIONS,
  WEEKDAY_DAYS,
  dayInitial,
  formatTime,
  ordinal,
  scheduleFreq,
  scheduleLabel,
} from './shared/utils';

interface Props {
  value?: Schedule | null;
  onChange: (s: Schedule | null) => void;
}

/** Frequency-first scheduler: Never / Daily / Weekdays / Weekly / Monthly. Holds its own
 *  working state so the controls update instantly — the drawer persists each change
 *  through the server, and a purely controlled value would snap back during that
 *  round-trip. Seeded per mount, then local-authoritative. A non-preset cron shows
 *  read-only so it isn't silently overwritten. */
function ScheduleControl({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [sched, setSched] = useState<Schedule | null>(() => value ?? null);

  const freq = scheduleFreq(sched);
  const time = sched?.time ?? '09:00';
  const showDays = freq === 'daily' || freq === 'weekdays' || freq === 'weekly';

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

  // a cron set elsewhere can land off the hour; keep it pickable rather than blank
  const timeOptions = TIME_OPTIONS.some((o) => o.value === time)
    ? TIME_OPTIONS
    : [...TIME_OPTIONS, { value: time, label: formatTime(time) }].sort((a, b) =>
        a.value.localeCompare(b.value),
      );
  const dayOfMonthOptions = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: t('the {{day}}', { day: ordinal(i + 1) }),
  }));

  // One wrapping line: frequency, its day-of-month (monthly), then the time; the day
  // picker for daily / weekdays / weekly sits under it.
  return (
    <div className="m-runset__schedule">
      <div className="m-runset__sched">
        <SimpleSelect
          ariaLabel={t('How often')}
          value={freq ?? 'never'}
          onChange={(f) => f && setFreq(f as ScheduleFreq | 'never')}
          options={options}
          className="m-runset__freq"
        />
        {freq === 'monthly' && (
          <SimpleSelect
            ariaLabel={t('On which day of the month')}
            value={String(sched?.dayOfMonth || 1)}
            onChange={(d) =>
              d && update({ ...(sched as Schedule), dayOfMonth: Number(d) })
            }
            options={dayOfMonthOptions}
            className="m-runset__dom"
          />
        )}
        {freq && freq !== 'custom' && (
          <SimpleSelect
            ariaLabel={t('At what time')}
            value={time}
            onChange={(v) => v && setTime(v)}
            options={timeOptions}
            className="m-runset__time"
          />
        )}
        {/* legacy non-preset cron — read-only (no picker option to create one) */}
        {freq === 'custom' && (
          <span className="m-runset__cron">{sched?.cron}</span>
        )}
      </div>

      {/* day squares — shared by daily / weekdays / weekly; toggling reclassifies */}
      {showDays && (
        <div className="m-runset__days" role="group" aria-label={t('Days')}>
          {DAY_SHORT.map((_, d) => {
            const on = !!sched?.days?.includes(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                aria-label={t(DAY_SHORT[d])}
                onClick={() => pickDay(d)}
                className={`m-runset__day${on ? ' is-on' : ''}`}
              >
                {dayInitial(t, d)}
              </button>
            );
          })}
        </div>
      )}

      {/* plain-language confirmation of the resolved schedule */}
      {freq && freq !== 'custom' && (
        <span className="m-runset__said">{scheduleLabel(t, sched)}</span>
      )}
    </div>
  );
}

export default ScheduleControl;
