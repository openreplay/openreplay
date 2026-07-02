import { Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Schedule, ScheduleFreq } from './shared/types';
import {
  ALL_DAYS,
  DAY_LABELS,
  DOM_OPTIONS,
  FREQ_OPTIONS,
  TIME_OPTIONS,
  WEEKDAY_DAYS,
  scheduleFreq,
} from './shared/utils';

interface Props {
  value?: Schedule | null;
  onChange: (s: Schedule | null) => void;
}

/** Frequency-first scheduler: pick Daily / Weekdays / Weekly / Monthly / Custom (or
 *  Never), then a time. Weekly + Custom reveal the day picker; Monthly a day-of-month. */
function ScheduleControl({ value, onChange }: Props) {
  const { t } = useTranslation();
  const freq = scheduleFreq(value);
  const time = value?.time ?? '09:00';

  // Build a fresh schedule for the chosen frequency, carrying time/days where it helps.
  const setFreq = (f: ScheduleFreq | 'never') => {
    if (f === 'never') return onChange(null);
    if (f === 'daily') return onChange({ freq: f, days: ALL_DAYS, time });
    if (f === 'weekdays')
      return onChange({ freq: f, days: WEEKDAY_DAYS, time });
    if (f === 'weekly')
      return onChange({ freq: f, days: [value?.days?.[0] ?? 1], time });
    if (f === 'monthly')
      return onChange({
        freq: f,
        days: [],
        dayOfMonth: value?.dayOfMonth ?? 1,
        time,
      });
    // custom — seed with the existing days, or Mon/Wed/Fri as a starting point
    return onChange({
      freq: f,
      days: value?.days?.length ? value.days : [1, 3, 5],
      time,
    });
  };

  const setTime = (newTime: string) =>
    onChange({ ...(value as Schedule), time: newTime });

  // Custom: multi-select. Weekly: single-select. Both render the same pill row.
  const pickDay = (d: number) => {
    if (freq === 'weekly')
      return onChange({ ...(value as Schedule), days: [d] });
    const days = value?.days?.includes(d)
      ? value.days.filter((x) => x !== d)
      : [...(value?.days ?? []), d];
    onChange({ ...(value as Schedule), freq: 'custom', days });
  };

  const showDays = freq === 'weekly' || freq === 'custom';

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

  // Everything on one wrapping line: frequency, then its day picker (weekly/custom)
  // or day-of-month (monthly), then the time — to spare vertical space.
  return (
    <div className="flex items-center gap-x-2 gap-y-2 flex-wrap">
      <Select
        size="small"
        value={freq ?? 'never'}
        options={FREQ_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
        style={{ width: 124 }}
        onChange={setFreq}
      />

      {freq === 'monthly' && (
        <span className="flex items-center gap-2">
          <span className="text-sm text-disabled-text">{t('on')}</span>
          <Select
            size="small"
            value={value?.dayOfMonth ?? 1}
            options={DOM_OPTIONS.map((o) => ({ ...o, label: t(o.label) }))}
            style={{ width: 116 }}
            onChange={(dayOfMonth) =>
              onChange({ ...(value as Schedule), dayOfMonth })
            }
          />
        </span>
      )}

      {showDays && (
        <span className="flex items-center gap-1">
          {DAY_LABELS.map((label, d) => {
            const on = value?.days?.includes(d);
            return (
              <button
                key={d}
                type="button"
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

      {freq && TimeSelect}
    </div>
  );
}

export default ScheduleControl;
