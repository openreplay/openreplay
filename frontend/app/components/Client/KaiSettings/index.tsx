import withPageTitle from 'HOCs/withPageTitle';
import { Tabs } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { PageTitle } from 'UI';

import RunsTab from './components/RunsTab';
import SettingsTab from './components/SettingsTab';
import TestsTab from './components/TestsTab';

function KaiSettings() {
  const { t } = useTranslation();

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
    <div className="bg-white rounded-lg border shadow-xs p-4">
      <div className="pb-0">
        <PageTitle title={t('Test Agents')} />
      </div>
      <Tabs defaultActiveKey="tests" items={tabItems} />
    </div>
  );
}

export default withPageTitle('Test Agents - OpenReplay Preferences')(
  KaiSettings,
);
