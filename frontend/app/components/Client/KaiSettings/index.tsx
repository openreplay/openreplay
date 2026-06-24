import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions';
import { Tabs } from 'antd';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { PageTitle } from 'UI';

import SiteDropdown from 'Shared/SiteDropdown';

import RunsTab from './components/RunsTab';
import SettingsTab from './components/SettingsTab';
import { BrowserTestsProjectProvider } from './queries';

function KaiSettings() {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  // Local project selection, defaulting to the globally-active project. Kept
  // local so changing it here doesn't change the project elsewhere in the app.
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>();
  const siteId = selectedSiteId ?? String(projectsStore.activeSiteId ?? '');

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
    <BrowserTestsProjectProvider value={siteId}>
      <div className="bg-white rounded-lg border shadow-xs p-4">
        <div className="flex items-center gap-2 pb-0">
          <PageTitle title={t('Test Agents')} />
          <SiteDropdown
            value={siteId}
            onChange={({ value }: any) =>
              setSelectedSiteId(String(value.value))
            }
          />
        </div>
        <Tabs defaultActiveKey="settings" items={tabItems} />
      </div>
    </BrowserTestsProjectProvider>
  );
}

export default withPageTitle('Test Agents - OpenReplay Preferences')(
  withPermissions(['BROWSER_TESTS'], '')(observer(KaiSettings)),
);
