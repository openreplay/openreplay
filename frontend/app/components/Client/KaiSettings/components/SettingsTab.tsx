import { Divider, Switch, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useSettings,
  useUpdateNotifications,
  useUpdateSettings,
} from '../queries';
import Defaults from './Defaults';
import Environments from './Environments';
import { Resolution } from './shared/types';
import { kaiUi, useKaiUi } from './shared/uiStore';

// Project run defaults + revision policy persist via GET/PATCH /settings; the default
// environment is the one flagged isDefault (Environments). Notifications persist via
// PATCH /notifications (per-user; no GET, so the switches start from a local default).
function SettingsTab() {
  const { t } = useTranslation();
  const { defaults, pauseOnRevision } = useKaiUi();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const updateNotifications = useUpdateNotifications();
  const [dailySummary, setDailySummary] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(false);

  // mirror the saved project settings into the ui store, which the Tests tab / drawers
  // read for pre-fill + the needs-review pause behaviour (external-store sync, not React
  // state — so it stays out of render).
  useEffect(() => {
    if (!settings) return;
    kaiUi.setDefaults({
      resolution: (settings.defaultViewport as Resolution) || undefined,
      region: settings.defaultRegion || undefined,
    });
    kaiUi.setPauseOnRevision(settings.pauseOnNewRevisions);
  }, [settings]);

  const changeDefaults = (patch: {
    envId?: string;
    resolution?: Resolution;
    region?: string;
  }) => {
    kaiUi.setDefaults(patch);
    // viewport / region persist to the project settings ("" clears to null); the default
    // environment is a per-environment flag, kept session-local here (see todo.md).
    if ('resolution' in patch)
      updateSettings.mutate({ defaultViewport: patch.resolution ?? '' });
    if ('region' in patch)
      updateSettings.mutate({ defaultRegion: patch.region ?? '' });
  };

  const setPause = (v: boolean) => {
    kaiUi.setPauseOnRevision(v);
    updateSettings.mutate({ pauseOnNewRevisions: v });
  };

  const setDaily = (v: boolean) => {
    setDailySummary(v);
    updateNotifications.mutate({ dailySummary: v });
  };
  const setWeekly = (v: boolean) => {
    setWeeklySummary(v);
    updateNotifications.mutate({ weeklySummary: v });
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
