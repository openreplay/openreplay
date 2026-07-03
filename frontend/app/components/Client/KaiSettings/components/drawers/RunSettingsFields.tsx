import { Select } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import CountryFlagIcon from 'Shared/CountryFlagIcon';

import { useEnvironments } from '../../queries';
import ScheduleControl from '../ScheduleControl';
import { Resolution, RunDefaults, Schedule } from '../shared/types';
import {
  REGION_OPTIONS,
  RESOLUTION_ICON,
  RESOLUTION_OPTIONS,
  regionLabel,
  resolutionLabel,
} from '../shared/utils';
import { Field } from './EntityDrawer';

// Environments persist (ids); resolutions/regions are UI-only for now — see todo.md.
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

/** Shared environment / resolution / region / schedule editor used by Draft + Test.
 *  Environment · Resolution · Region are multi-select (a test runs across the matrix);
 *  they share one row and the schedule sits below it. */
function RunSettingsFields({ value, onChange, defaults, defaultHints }: Props) {
  const { t } = useTranslation();
  const { data } = useEnvironments();
  const envOptions = (data?.items ?? []).map((env) => ({
    value: env.environmentId,
    label: env.name,
  }));

  // narrow cells can't show chips nicely → collapse the box to a summary. A single
  // selection shows its name — suffixed "(default)" when it came from Settings'
  // default run configuration (draft / manual-create flow only).
  const summarize =
    (toLabel: (v: any) => string, defaultValue?: string) =>
    (omitted: { label: React.ReactNode; value: any }[]) => {
      if (omitted.length === 1) {
        const v = omitted[0].value;
        const isDefault =
          defaultHints && defaultValue != null && v === defaultValue;
        return `${toLabel(v)}${isDefault ? ` ${t('(default)')}` : ''}`;
      }
      return `${omitted.length} ${t('selected')}`;
    };
  const envName = (id: unknown) =>
    envOptions.find((o) => o.value === id)?.label ?? String(id);
  const envSummary = summarize(envName, defaults?.envId);
  const viewportSummary = summarize(
    (v) => t(resolutionLabel(v)),
    defaults?.resolution,
  );
  const regionSummary = summarize((v) => regionLabel(v), defaults?.region);

  return (
    <div className="flex flex-col gap-4 kai-run-settings">
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('Environments')}>
          <Select
            mode="multiple"
            size="small"
            showSearch={false}
            value={value.environments}
            options={envOptions}
            style={{ width: '100%' }}
            placeholder={t('Any')}
            maxTagCount={0}
            maxTagPlaceholder={envSummary}
            onChange={(environments) => onChange({ environments })}
          />
        </Field>

        <Field label={t('Viewports')}>
          <Select
            mode="multiple"
            size="small"
            showSearch={false}
            value={value.resolutions}
            style={{ width: '100%' }}
            placeholder={t('Any')}
            maxTagCount={0}
            maxTagPlaceholder={viewportSummary}
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
            maxTagPlaceholder={regionSummary}
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
