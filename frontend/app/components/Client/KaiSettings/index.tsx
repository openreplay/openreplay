import withPageTitle from 'HOCs/withPageTitle';
import { Tabs } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PageTitle } from 'UI';

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
    <div className="bg-white rounded-lg border shadow-xs overflow-hidden">
      <div className="px-4 pt-4">
        <PageTitle title={t('Test Agents')} />
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

export default withPageTitle('Test Agents - OpenReplay Preferences')(
  KaiSettings,
);
