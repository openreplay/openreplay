import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions';
import { Button } from 'antd';
import { Album, Settings as SettingsIcon } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory } from 'App/routing';

import PreferencesPage from '../PreferencesPage';
import RunsTab from './components/RunsTab';
import SettingsTab from './components/SettingsTab';
import TestsTab from './components/TestsTab';
import { KaiTab, kaiUi, useKaiUi } from './components/shared/uiStore';
import { useQueryParam } from './components/shared/useUrlState';
import { BrowserTestsProjectProvider } from './queries';

function KaiSettings() {
  const { t } = useTranslation();
  const { projectsStore } = useStore();
  const history = useHistory();
  // controlled by the ui store so drawers can deep-link across tabs ("View runs")
  const { activeTab } = useKaiUi();
  // active tab persists in the URL (?tab=) so a reload / shared link restores it
  const [tabParam, setTabParam] = useQueryParam('tab');
  const seededRef = useRef(false);
  useEffect(() => {
    const valid =
      tabParam === 'tests' || tabParam === 'runs' || tabParam === 'settings';
    if (valid && tabParam !== activeTab) {
      kaiUi.setActiveTab(tabParam as KaiTab);
      seededRef.current = true; // swallow the stale sync write that follows the seed
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (seededRef.current) {
      seededRef.current = false;
      return;
    }
    setTabParam(activeTab);
  }, [activeTab, setTabParam]);
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
      // renamed from "Settings" (Mehdi 07-27): only core config lives here;
      // behaviour toggles + notifications moved to Preferences > Agents
      key: 'settings',
      label: t('Environments'),
      children: <SettingsTab />,
    },
  ];

  return (
    <BrowserTestsProjectProvider value={siteId}>
      <PreferencesPage
        title={t('Test Agents')}
        help={t(
          'End-to-end tests our agents write and maintain from your real user journeys. Review a draft, approve it, and schedule it — the agent runs it and reports every regression here.',
        )}
        actions={
          <>
            {/* shortcut to the shared agent preferences (Mehdi 07-27):
                notifications + behaviour live there, not on this page */}
            <Button
              type="text"
              size="small"
              icon={<SettingsIcon size={14} />}
              onClick={() => history.push('/client/agents?agent=tests')}
            >
              {t('Settings')}
            </Button>
            <a
              href="https://docs.openreplay.com/"
              target="_blank"
              rel="noreferrer"
            >
              <Button type="text" size="small" icon={<Album size={14} />}>
                {t('Docs')}
              </Button>
            </a>
          </>
        }
        tabs={tabItems}
        activeTab={activeTab}
        onTabChange={(k) => kaiUi.setActiveTab(k as KaiTab)}
      />
    </BrowserTestsProjectProvider>
  );
}

export default withPageTitle('Test Agents - OpenReplay')(
  withPermissions(['BROWSER_TESTS'], '')(observer(KaiSettings)),
);
