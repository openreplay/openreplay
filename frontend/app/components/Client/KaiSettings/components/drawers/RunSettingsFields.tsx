import { Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import ScheduleControl from '../ScheduleControl';
import { MOCK_ENVIRONMENTS } from '../shared/mockData';
import { Resolution, Schedule } from '../shared/types';
import {
  REGION_OPTIONS,
  RESOLUTION_ICON,
  RESOLUTION_OPTIONS,
} from '../shared/utils';
import { Field } from './EntityDrawer';

const ENV_OPTIONS = MOCK_ENVIRONMENTS.map((env) => ({
  value: env.name,
  label: env.name,
}));

export interface RunSettings {
  envNames?: string[];
  resolutions?: Resolution[];
  regions?: string[];
  schedule?: Schedule | null;
}

interface Props {
  value: RunSettings;
  onChange: (patch: Partial<RunSettings>) => void;
}

/** Shared environment / resolution / region / schedule editor used by Draft + Test.
 *  Environment · Resolution · Region are multi-select (a test runs across the matrix);
 *  they share one row and the schedule sits below it. */
function RunSettingsFields({ value, onChange }: Props) {
  const { t } = useTranslation();

  // narrow cells can't show chips nicely → collapse the box to a clean "N selected".
  const summary = (omitted: { label: React.ReactNode; value: any }[]) =>
    `${omitted.length} ${t('selected')}`;

  return (
    <div className="flex flex-col gap-4 kai-run-settings">
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('Environments')}>
          <Select
            mode="multiple"
            size="small"
            showSearch={false}
            value={value.envNames}
            options={ENV_OPTIONS}
            style={{ width: '100%' }}
            placeholder={t('Any')}
            maxTagCount={0}
            maxTagPlaceholder={summary}
            onChange={(envNames) => onChange({ envNames })}
          />
        </Field>

        <Field label={t('Resolutions')}>
          <Select
            mode="multiple"
            size="small"
            showSearch={false}
            value={value.resolutions}
            style={{ width: '100%' }}
            placeholder={t('Any')}
            maxTagCount={0}
            maxTagPlaceholder={summary}
            onChange={(v) => onChange({ resolutions: v as Resolution[] })}
            options={RESOLUTION_OPTIONS.map((o) => {
              const Icon = RESOLUTION_ICON[o.value];
              return {
                value: o.value,
                label: (
                  <span className="flex items-center gap-1.5">
                    <Icon size={15} />
                    {t(o.label)}
                  </span>
                ),
              };
            })}
          />
        </Field>

        <Field label={t('Regions')}>
          <Select
            mode="multiple"
            size="small"
            showSearch={false}
            value={value.regions}
            style={{ width: '100%' }}
            placeholder={t('Any')}
            maxTagCount={0}
            maxTagPlaceholder={summary}
            onChange={(regions) => onChange({ regions })}
            options={REGION_OPTIONS.map((o) => ({
              value: o.value,
              label: (
                <span className="flex items-center gap-1.5">
                  <CountryFlagIcon
                    countryCode={o.country}
                    style={{ width: 16, borderRadius: 2 }}
                  />
                  {o.label}
                </span>
              ),
            }))}
          />
        </Field>
      </div>

      <Field label={t('Schedule')}>
        <ScheduleControl
          value={value.schedule}
          onChange={(schedule) => onChange({ schedule })}
        />
      </Field>
    </div>
  );
}

export default RunSettingsFields;
