import withPageTitle from 'HOCs/withPageTitle';
import withPermissions from 'HOCs/withPermissions';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';

import { useStore } from 'App/mstore';

import RunsTab from './components/RunsTab';
import SettingsTab from './components/SettingsTab';
import { SyntheticsStandalone } from './components/SyntheticsFrame';
import TestsTab from './components/TestsTab';
import { KaiTab, kaiUi, useKaiUi } from './components/shared/uiStore';
import { useQueryParam } from './components/shared/useUrlState';
import { BrowserTestsProjectProvider } from './queries';

const SECTIONS: { key: KaiTab; Body: React.ComponentType }[] = [
  { key: 'tests', Body: TestsTab },
  { key: 'runs', Body: RunsTab },
  { key: 'settings', Body: SettingsTab },
];

function SmartTests({ standalone = false }: { standalone?: boolean }) {
  const { projectsStore } = useStore();
  // held in the ui store so drawers can deep-link across tabs ("View runs")
  const { activeTab } = useKaiUi();
  // and mirrored in the URL (?tab=) so a reload / shared link restores it
  const [tabParam, setTabParam] = useQueryParam('tab');
  const seededRef = useRef(false);
  useEffect(() => {
    const valid =
      tabParam === 'tests' || tabParam === 'runs' || tabParam === 'settings';
    if (valid && tabParam !== activeTab) {
      kaiUi.setActiveTab(tabParam as KaiTab);
      seededRef.current = true; // swallow the stale sync write that follows the seed
    }
  }, []);
  useEffect(() => {
    if (seededRef.current) {
      seededRef.current = false;
      return;
    }
    setTabParam(activeTab);
  }, [activeTab, setTabParam]);
  const siteId = String(projectsStore.activeSiteId ?? '');

  // a visited section stays mounted, so its filters and handoffs survive a tab switch
  const [visited, setVisited] = useState<KaiTab[]>([activeTab]);
  if (!visited.includes(activeTab)) setVisited([...visited, activeTab]);

  return (
    <BrowserTestsProjectProvider value={siteId}>
      <SyntheticsStandalone value={standalone}>
        {SECTIONS.filter((s) => visited.includes(s.key)).map(
          ({ key, Body }) => (
            <div
              key={key}
              className={key === activeTab ? 'contents' : 'hidden'}
            >
              <Body />
            </div>
          ),
        )}
      </SyntheticsStandalone>
    </BrowserTestsProjectProvider>
  );
}

export default withPageTitle('Synthetics - OpenReplay')(
  withPermissions(['BROWSER_TESTS'], '')(observer(SmartTests)),
);
