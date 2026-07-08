import withPageTitle from 'HOCs/withPageTitle';
import { Button, Tabs, Tooltip } from 'antd';
import { Album, Info } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import RunsTab from './components/RunsTab';
import SettingsTab from './components/SettingsTab';
import TestsTab from './components/TestsTab';
import { KaiTab, kaiStore, useKaiStore } from './components/shared/store';

function KaiSettings() {
  const { t } = useTranslation();
  // controlled by the store so drawers can deep-link across tabs ("View runs")
  const { activeTab } = useKaiStore();

  const tabItems = [
    {
      key: 'tests',
      label: t('Tests'),
      children: <TestsTab />,
    },
    {
      key: 'runs',
      label: t('Runs'),
      children: <RunsTab />,
    },
    {
      key: 'settings',
      label: t('Settings'),
      children: <SettingsTab />,
    },
  ];

  return (
    <div className="flex flex-col rounded-lg border bg-white">
      {/* header — mirrors the Issues page header (IssuesList.tsx) */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg">{t('Tests')}</span>
          <Tooltip
            placement="bottom"
            title={t(
              'End-to-end tests our agents write and maintain from your real user journeys. Review a draft, approve it, and schedule it — the agent runs it and reports every regression here.',
            )}
          >
            <span
              className="flex items-center cursor-help"
              style={{ color: 'var(--color-gray-medium)' }}
            >
              <Info size={15} />
            </span>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://docs.openreplay.com/"
            target="_blank"
            rel="noreferrer"
          >
            <Button type="text" icon={<Album size={14} />}>
              {t('Docs')}
            </Button>
          </a>
        </div>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={(k) => kaiStore.setActiveTab(k as KaiTab)}
        items={tabItems}
        tabBarStyle={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
      />
    </div>
  );
}

export default withPageTitle('Tests - OpenReplay')(KaiSettings);
