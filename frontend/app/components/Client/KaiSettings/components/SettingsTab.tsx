import { Divider, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  useEnvironments,
  useSettings,
  useUpdateEnvironment,
  useUpdateSettings,
} from '../queries';
import Defaults from './Defaults';
import Environments from './Environments';
import { Resolution, RunDefaults } from './shared/types';

// The Tests page's "Environments" tab: core config only — run defaults + the
// environments list. Behaviour (pause-on-revision) and notifications moved to
// Preferences > Agents > Tests (Mehdi 07-27). Everything here persists to its
// real source: run defaults to GET/PATCH /settings, the default environment to
// the env flagged `isDefault`.
function SettingsTab() {
  const { t } = useTranslation();
  const { data: settings } = useSettings();
  const { data: envData } = useEnvironments({ limit: 100 });
  const updateSettings = useUpdateSettings();
  const updateEnv = useUpdateEnvironment();

  const defaultEnv = (envData?.items ?? []).find((e) => e.isDefault);
  const defaults: RunDefaults = {
    envId: defaultEnv?.environmentId,
    resolution: (settings?.defaultViewport as Resolution) || undefined,
    region: settings?.defaultRegion || undefined,
  };

  const changeDefaults = (patch: Partial<RunDefaults>) => {
    // viewport / region → project settings ("" clears to null)
    if ('resolution' in patch)
      updateSettings.mutate({ defaultViewport: patch.resolution ?? '' });
    if ('region' in patch)
      updateSettings.mutate({ defaultRegion: patch.region ?? '' });
    // default environment → the env's `isDefault` flag (PUT replaces name/baseUrl/
    // variables, so send them back unchanged; setting one true demotes the prior).
    if ('envId' in patch) {
      const target = (envData?.items ?? []).find(
        (e) => e.environmentId === patch.envId,
      );
      const demote = patch.envId == null && defaultEnv ? defaultEnv : undefined;
      const env = target ?? demote;
      if (env)
        updateEnv.mutate({
          environmentId: env.environmentId,
          body: {
            name: env.name,
            baseUrl: env.baseUrl,
            variables: env.variables,
            isDefault: !!target,
          },
        });
    }
  };

  return (
    <div className="flex flex-col p-5 max-w-3xl">
      {/* Defaults — pre-fill new tests' run settings */}
      <section className="flex flex-col gap-3">
        <div>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {t('Default run configuration')}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm!">
            {t('New tests start with these. You can override them per test.')}
          </Typography.Text>
        </div>
        <Defaults value={defaults} onChange={changeDefaults} />
      </section>

      <Divider />

      <Environments />
    </div>
  );
}

export default SettingsTab;
