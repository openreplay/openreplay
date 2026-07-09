import { Divider, Switch, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  useEnvironments,
  useNotifications,
  useSettings,
  useUpdateEnvironment,
  useUpdateNotifications,
  useUpdateSettings,
} from '../queries';
import Defaults from './Defaults';
import Environments from './Environments';
import { Resolution, RunDefaults } from './shared/types';

// Everything here persists to its real source: run defaults + revision policy to
// GET/PATCH /settings, the default environment to the env flagged `isDefault`, and
// notifications to GET/PATCH /notifications.
function SettingsTab() {
  const { t } = useTranslation();
  const { data: settings } = useSettings();
  const { data: envData } = useEnvironments({ limit: 100 });
  const { data: notifications } = useNotifications();
  const updateSettings = useUpdateSettings();
  const updateEnv = useUpdateEnvironment();
  const updateNotifications = useUpdateNotifications();
  const dailySummary = !!notifications?.dailySummary;
  const weeklySummary = !!notifications?.weeklySummary;
  const pauseOnRevision = settings?.pauseOnNewRevisions ?? true;

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

  const setPause = (v: boolean) =>
    updateSettings.mutate({ pauseOnNewRevisions: v });

  const setDaily = (v: boolean) => updateNotifications.mutate({ dailySummary: v });
  const setWeekly = (v: boolean) =>
    updateNotifications.mutate({ weeklySummary: v });

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

      {/* Revisions — applies to ALL tests; per-test can come later */}
      <section className="flex flex-col gap-4">
        <div>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {t('Revisions')}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm!">
            {t('What happens when the agent proposes a new version of a test.')}
          </Typography.Text>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="font-medium">
              {t('Pause tests on new revisions')}
            </span>
            <Typography.Text type="secondary" className="text-sm!">
              {t(
                'A changed flow usually breaks the current steps. When on, tests pause until the new version is reviewed; when off, they keep running on the current version.',
              )}
            </Typography.Text>
          </div>
          <Switch checked={pauseOnRevision} onChange={setPause} />
        </div>
      </section>

      <Divider />

      <Environments />

      <Divider />

      {/* Notifications */}
      <section className="flex flex-col gap-4">
        <div>
          <Typography.Title level={5} style={{ marginBottom: 0 }}>
            {t('Notifications')}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-sm!">
            {t('How you hear about your test runs.')}
          </Typography.Text>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="font-medium">{t('Daily summary')}</span>
            <Typography.Text type="secondary" className="text-sm!">
              {t('A daily digest of all test runs, sent to your email.')}
            </Typography.Text>
          </div>
          <Switch checked={dailySummary} onChange={setDaily} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="font-medium">{t('Weekly summary')}</span>
            <Typography.Text type="secondary" className="text-sm!">
              {t('A weekly digest of all test runs, sent to your email.')}
            </Typography.Text>
          </div>
          <Switch checked={weeklySummary} onChange={setWeekly} />
        </div>
      </section>
    </div>
  );
}

export default SettingsTab;
