import { Select, Switch } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Schedule } from './shared/types';
import { DAY_LABELS, TIME_OPTIONS } from './shared/utils';

const DEFAULT: Schedule = { days: [1, 2, 3, 4, 5], time: '09:00' };

interface Props {
  value?: Schedule | null;
  onChange: (s: Schedule | null) => void;
}

function ScheduleControl({ value, onChange }: Props) {
  const { t } = useTranslation();
  const scheduled = !!value && value.days.length > 0;
  const sched = value && value.days.length ? value : DEFAULT;

  const toggleDay = (d: number) => {
    const days = sched.days.includes(d)
      ? sched.days.filter((x) => x !== d)
      : [...sched.days, d];
    onChange({ ...sched, days });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Switch
          size="small"
          checked={scheduled}
          onChange={(on) => onChange(on ? DEFAULT : null)}
        />
        <span className="text-sm">
          {scheduled
            ? t('Runs on a schedule')
            : t('Runs manually only (never)')}
        </span>
      </div>
      {scheduled && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            {DAY_LABELS.map((label, d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`w-7 h-7 rounded-full text-xs border transition-colors ${
                  sched.days.includes(d)
                    ? 'bg-active-blue border-active-blue-border text-blue'
                    : 'border-gray-light text-disabled-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-disabled-text">{t('at')}</span>
            <Select
              size="small"
              value={sched.time}
              options={TIME_OPTIONS}
              style={{ width: 120 }}
              onChange={(time) => onChange({ ...sched, time })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleControl;
