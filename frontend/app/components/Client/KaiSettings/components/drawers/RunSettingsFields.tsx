import { Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ScheduleControl from '../ScheduleControl';
import { MOCK_ENVIRONMENTS } from '../shared/mockData';
import { Resolution, Schedule } from '../shared/types';
import { REGION_OPTIONS, RESOLUTION_OPTIONS } from '../shared/utils';
import { Field } from './EntityDrawer';

const ENV_OPTIONS = MOCK_ENVIRONMENTS.map((env) => ({
  value: env.name,
  label: env.name,
}));

export interface RunSettings {
  envName?: string;
  resolution?: Resolution;
  region?: string;
  schedule?: Schedule | null;
}

interface Props {
  value: RunSettings;
  onChange: (patch: Partial<RunSettings>) => void;
}

/** Shared environment / resolution / region / schedule editor used by Draft + Test. */
function RunSettingsFields({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <Field label={t('Environment')}>
        <Select
          size="small"
          value={value.envName}
          options={ENV_OPTIONS}
          style={{ width: '100%' }}
          placeholder={t('Select an environment')}
          onChange={(envName) => onChange({ envName })}
        />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label={t('Resolution')}>
            <Select
              size="small"
              value={value.resolution ?? 'desktop'}
              options={RESOLUTION_OPTIONS}
              style={{ width: '100%' }}
              onChange={(resolution) =>
                onChange({ resolution: resolution as Resolution })
              }
            />
          </Field>
        </div>
        <div className="flex-1">
          <Field label={t('Region')}>
            <Select
              size="small"
              value={value.region ?? 'paris'}
              options={REGION_OPTIONS}
              style={{ width: '100%' }}
              onChange={(region) => onChange({ region })}
            />
          </Field>
        </div>
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
