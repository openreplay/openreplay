import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions';
import { Button, Tabs, Tooltip } from 'antd';
import { Album, Info } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import SiteDropdown from 'Shared/SiteDropdown';

import RunsTab from './components/RunsTab';
import SettingsTab from './components/SettingsTab';
import TestsTab from './components/TestsTab';
import { KaiTab, kaiUi, useKaiUi } from './components/shared/uiStore';
import { useUrlState } from './components/shared/useUrlState';
import { BrowserTestsProjectProvider } from './queries';

function KaiSettings() {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  // controlled by the ui store so drawers can deep-link across tabs ("View runs")
  const { activeTab } = useKaiUi();
  // active tab persists in the URL (?tab=) so a reload / shared link restores it
  const { get, set } = useUrlState();
  const seededRef = useRef(false);
  useEffect(() => {
    const urlTab = get('tab');
    const valid =
      urlTab === 'tests' || urlTab === 'runs' || urlTab === 'settings';
    if (valid && urlTab !== activeTab) {
      kaiUi.setActiveTab(urlTab as KaiTab);
      seededRef.current = true; // swallow the stale sync write that follows the seed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (seededRef.current) {
      seededRef.current = false;
      return;
    }
    set('tab', activeTab);
  }, [activeTab, set]);
  // Local project selection, defaulting to the globally-active project. Kept
  // local so changing it here doesn't change the project elsewhere in the app.
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>();
  const siteId = selectedSiteId ?? String(projectsStore.activeSiteId ?? '');

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
    <BrowserTestsProjectProvider value={siteId}>
      <div className="bg-white rounded-lg border shadow-xs overflow-hidden">
        {/* header — title + info, project selector + docs (mirrors the app's list pages) */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{t('Test Agents')}</span>
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
            <SiteDropdown
              value={siteId}
              onChange={({ value }: any) =>
                setSelectedSiteId(String(value.value))
              }
            />
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
          onChange={(k) => kaiUi.setActiveTab(k as KaiTab)}
          items={tabItems}
          tabBarStyle={{ paddingLeft: 16, paddingRight: 16, marginBottom: 0 }}
        />
      </div>
    </BrowserTestsProjectProvider>
  );
}

export default withPageTitle('Test Agents - OpenReplay')(
  withPermissions(['BROWSER_TESTS'], '')(observer(KaiSettings)),
);
