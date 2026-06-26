import { Segmented, Select, Tooltip } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
  envName?: string;
  resolution?: Resolution;
  region?: string;
  schedule?: Schedule | null;
}

interface Props {
  value: RunSettings;
  onChange: (patch: Partial<RunSettings>) => void;
}

/** Shared environment / resolution / region / schedule editor used by Draft + Test.
 *  Environment · Resolution · Region share one row; schedule sits below it. */
function RunSettingsFields({ value, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('Environment')}>
          <Select
            size="small"
            value={value.envName}
            options={ENV_OPTIONS}
            style={{ width: '100%' }}
            placeholder={t('Select')}
            onChange={(envName) => onChange({ envName })}
          />
        </Field>

        <Field label={t('Resolution')}>
          <Segmented
            size="small"
            block
            value={value.resolution ?? 'desktop'}
            onChange={(v) => onChange({ resolution: v as Resolution })}
            options={RESOLUTION_OPTIONS.map((o) => {
              const Icon = RESOLUTION_ICON[o.value];
              return {
                value: o.value,
                label: (
                  <Tooltip title={t(o.label)}>
                    <span className="flex items-center justify-center py-0.5">
                      <Icon size={15} />
                    </span>
                  </Tooltip>
                ),
              };
            })}
          />
        </Field>

        <Field label={t('Region')}>
          <Select
            size="small"
            value={value.region ?? 'paris'}
            style={{ width: '100%' }}
            onChange={(region) => onChange({ region })}
            options={REGION_OPTIONS.map((o) => ({
              value: o.value,
              label: (
                <span className="flex items-center gap-1.5">
                  <span>{o.flag}</span>
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
