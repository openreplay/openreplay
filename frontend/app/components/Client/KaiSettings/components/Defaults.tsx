import { Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { useEnvironments } from '../queries';
import { Field } from './drawers/EntityDrawer';
import { Resolution } from './shared/types';
import {
  REGION_OPTIONS,
  RESOLUTION_ICON,
  RESOLUTION_OPTIONS,
} from './shared/utils';

export interface RunDefaults {
  envId?: string;
  resolution?: Resolution;
  region?: string;
}

interface Props {
  value: RunDefaults;
  onChange: (patch: Partial<RunDefaults>) => void;
}

const LOOKUP_LIMIT = 100;

// The preset environment / device / region that pre-fill a new test's run settings.
// Single-select — the multi-select matrix lives per-test (RunSettingsFields). Not yet
// persisted anywhere — see todo.md.
function Defaults({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { data } = useEnvironments({ limit: LOOKUP_LIMIT });
  const envOptions = (data?.items ?? []).map((env) => ({
    value: env.environmentId,
    label: env.name,
  }));

  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label={t('Default environment')}>
        <Select
          allowClear
          showSearch={false}
          value={value.envId}
          style={{ width: '100%' }}
          placeholder={t('Select environment')}
          onChange={(envId) => onChange({ envId })}
          options={envOptions}
        />
      </Field>

      <Field label={t('Default device')}>
        <Select
          showSearch={false}
          value={value.resolution}
          style={{ width: '100%' }}
          placeholder={t('Select device')}
          onChange={(resolution) => onChange({ resolution })}
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

      <Field label={t('Default region')}>
        <Select
          showSearch={false}
          value={value.region}
          style={{ width: '100%' }}
          placeholder={t('Select region')}
          onChange={(region) => onChange({ region })}
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
  );
}

export default Defaults;
