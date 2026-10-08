import { SimpleSelect } from '@/ui/inputs/select';
import React from 'react';
import { useTranslation } from 'react-i18next';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { useEnvironments } from '../queries';
import { Resolution, RunDefaults } from './shared/types';
import {
  LOOKUP_LIMIT,
  REGION_OPTIONS,
  RESOLUTION_ICON,
  RESOLUTION_OPTIONS,
} from './shared/utils';

export type { RunDefaults };

interface Props {
  value: RunDefaults;
  onChange: (patch: Partial<RunDefaults>) => void;
}

// The preset environment / device / region that pre-fill a new test's run settings.
// Single values — the multi-select matrix lives per-test (RunSettingsFields).
function Defaults({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { data } = useEnvironments({ limit: LOOKUP_LIMIT });

  return (
    <section className="m-envs__section">
      <header className="m-envs__head">
        <div>
          <h2 className="m-envs__title">{t('Default run configuration')}</h2>
          <p className="m-envs__sub">
            {t('New tests start with these. You can override them per test.')}
          </p>
        </div>
      </header>
      <div className="m-envs__defaults">
        <label className="m-envs__field">
          <span className="m-envs__label">{t('Environment')}</span>
          <SimpleSelect
            clearable
            value={value.envId}
            placeholder={t('Not set')}
            ariaLabel={t('Default environment')}
            onChange={(envId) => onChange({ envId })}
            options={(data?.items ?? []).map((env) => ({
              value: env.environmentId,
              label: env.name,
            }))}
          />
        </label>
        <label className="m-envs__field">
          <span className="m-envs__label">{t('Viewport')}</span>
          <SimpleSelect<Resolution>
            value={value.resolution}
            placeholder={t('Not set')}
            ariaLabel={t('Default viewport')}
            onChange={(resolution) => onChange({ resolution })}
            options={RESOLUTION_OPTIONS.map((o) => {
              const Icon = RESOLUTION_ICON[o.value];
              return {
                value: o.value,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <Icon size={14} aria-hidden="true" />
                    {t(o.label)}
                  </span>
                ),
              };
            })}
          />
        </label>
        <label className="m-envs__field">
          <span className="m-envs__label">{t('Region')}</span>
          <SimpleSelect
            value={value.region}
            placeholder={t('Not set')}
            ariaLabel={t('Default region')}
            onChange={(region) => onChange({ region })}
            options={REGION_OPTIONS.map((o) => ({
              value: o.value,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <CountryFlagIcon
                    countryCode={o.country}
                    style={{ width: 16, borderRadius: 2 }}
                  />
                  {o.label}
                </span>
              ),
            }))}
          />
        </label>
      </div>
    </section>
  );
}

export default Defaults;
