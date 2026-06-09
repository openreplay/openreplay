import withPageTitle from 'HOCs/withPageTitle';
import { Tabs } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PageTitle } from 'UI';

import RunsTab from './components/RunsTab';
import SettingsTab from './components/SettingsTab';

function KaiSettings() {
  const { t } = useTranslation();

  const tabItems = [
    {
      key: 'settings',
      label: t('Auto-Testing Settings'),
      children: <SettingsTab />,
    },
    {
      key: 'runs',
      label: t('Test Runs'),
      children: <RunsTab />,
    },
  ];

  return (
    <div className="bg-white rounded-lg border shadow-xs p-4">
      <div className="pb-0">
        <PageTitle title={t('Test Agents')} />
      </div>
      <Tabs defaultActiveKey="settings" items={tabItems} />
    </div>
  );
}

export default withPageTitle('Test Agents - OpenReplay Preferences')(
  KaiSettings,
);
