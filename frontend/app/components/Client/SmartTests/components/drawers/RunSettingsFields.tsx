import { MultiSelect } from '@/ui/inputs/multi-select';
import React from 'react';
import { useTranslation } from 'react-i18next';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { useEnvironments } from '../../queries';
import ScheduleControl from '../ScheduleControl';
import { Resolution, RunDefaults, Schedule } from '../shared/types';
import {
  LOOKUP_LIMIT,
  REGION_OPTIONS,
  RESOLUTION_ICON,
  RESOLUTION_OPTIONS,
} from '../shared/utils';
import { Field } from './EntityDrawer';
import './run-settings.css';

// All persist: environments as ids, resolutions/regions into the test's `config`.
export interface RunSettings {
  environments?: string[];
  resolutions?: Resolution[];
  regions?: string[];
  schedule?: Schedule | null;
}

interface Props {
  value: RunSettings;
  onChange: (patch: Partial<RunSettings>) => void;
  /** draft / manual-create flow: values pre-filled from Settings' default run
   *  configuration get a "(default)" suffix until the user changes them */
  defaults?: RunDefaults;
  defaultHints?: boolean;
}

/** Shared environment / viewport / region / schedule editor used by Draft + Test. The
 *  three are multi-select (a test runs across the matrix) and share one row; each
 *  summarises rather than showing chips, so the drawer's height never changes. */
function RunSettingsFields({ value, onChange, defaults, defaultHints }: Props) {
  const { t } = useTranslation();
  const { data } = useEnvironments({ limit: LOOKUP_LIMIT });
  const suffix = (v: string, def?: string) =>
    defaultHints && def != null && v === def ? ` ${t('(default)')}` : '';

  return (
    <div className="m-runset">
      <div className="m-runset__row">
        <Field label={t('Environments')}>
          <MultiSelect
            ariaLabel={t('Environments')}
            value={value.environments ?? []}
            placeholder={t('Any')}
            onChange={(environments) => onChange({ environments })}
            options={(data?.items ?? []).map((env) => ({
              value: env.environmentId,
              label: env.name,
              text: `${env.name}${suffix(env.environmentId, defaults?.envId)}`,
            }))}
          />
        </Field>
        <Field label={t('Viewports')}>
          <MultiSelect<Resolution>
            ariaLabel={t('Viewports')}
            value={value.resolutions ?? []}
            placeholder={t('Any')}
            onChange={(resolutions) => onChange({ resolutions })}
            options={RESOLUTION_OPTIONS.map((o) => {
              const Icon = RESOLUTION_ICON[o.value];
              return {
                value: o.value,
                text: `${t(o.label)}${suffix(o.value, defaults?.resolution)}`,
                label: (
                  <span className="m-runset__opt">
                    <Icon size={13} aria-hidden="true" />
                    {t(o.label)}
                  </span>
                ),
              };
            })}
          />
        </Field>
        <Field label={t('Regions')}>
          <MultiSelect
            ariaLabel={t('Regions')}
            value={value.regions ?? []}
            placeholder={t('Any')}
            onChange={(regions) => onChange({ regions })}
            options={REGION_OPTIONS.map((o) => ({
              value: o.value,
              text: `${o.label}${suffix(o.value, defaults?.region)}`,
              label: (
                <span className="m-runset__opt">
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
