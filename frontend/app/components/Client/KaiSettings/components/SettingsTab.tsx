import { Divider, Switch, Typography } from 'antd';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Defaults from './Defaults';
import Environments from './Environments';
import { kaiStore, useKaiStore } from './shared/store';

function SettingsTab() {
  const { t } = useTranslation();

  // environments + defaults live in the shared store — deleting an environment has
  // to reach the tests, and the defaults pre-fill new drafts / manual tests
  const { environments, defaults, pauseOnRevision } = useKaiStore();
  const setEnvironments = kaiStore.setEnvironments;
  const [dailySummary, setDailySummary] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(true);

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
        <Defaults
          environments={environments}
          value={defaults}
          onChange={(patch) => kaiStore.setDefaults(patch)}
        />
      </section>

      <Divider />

      {/* Revisions — applies to ALL tests (Mehdi 07-06); per-test can come later */}
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
          <Switch
            checked={pauseOnRevision}
            onChange={kaiStore.setPauseOnRevision}
          />
        </div>
      </section>

      <Divider />

      <Environments
        environments={environments}
        setEnvironments={setEnvironments}
      />

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
          <Switch checked={dailySummary} onChange={setDailySummary} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="font-medium">{t('Weekly summary')}</span>
            <Typography.Text type="secondary" className="text-sm!">
              {t('A weekly digest of all test runs, sent to your email.')}
            </Typography.Text>
          </div>
          <Switch checked={weeklySummary} onChange={setWeeklySummary} />
        </div>
      </section>
    </div>
  );
}

export default SettingsTab;
