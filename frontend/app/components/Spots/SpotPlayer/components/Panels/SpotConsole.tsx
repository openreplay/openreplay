import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { VList, VListHandle } from 'virtua';

import { capitalize } from 'App/utils';
import BottomBlock from 'Components/shared/DevTools/BottomBlock';
import { TABS } from 'Components/shared/DevTools/ConsolePanel/ConsolePanel';
import ConsoleRow from 'Components/shared/DevTools/ConsoleRow';
import { NoData, PanelTabs } from 'Components/shared/DevTools/PanelKit';

import spotPlayerStore from '../../spotPlayerStore';

function SpotConsole({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState(TABS[0]);
  const _list = React.useRef<VListHandle>(null);

  const onTabClick = (tab: string) => {
    const newTab = TABS.find((t) => t.key === tab);
    if (newTab) setActiveTab(newTab);
  };
  const { logs } = spotPlayerStore;
  const filteredList = React.useMemo(
    () =>
      logs.filter((log) => {
        const tabType = activeTab.text.toLowerCase();
        if (tabType === 'all') return true;
        return tabType.includes(log.level);
      }),
    [activeTab],
  );

  const jump = (t: number) => {
    spotPlayerStore.setTime(t / 1000);
  };

  return (
    <BottomBlock>
      <BottomBlock.Header onClose={onClose}>
        <PanelTabs
          label={t('Console level')}
          active={activeTab.key}
          onSelect={(k) => onTabClick(k)}
          items={TABS.map((tab) => ({
            key: tab.key,
            label: t(capitalize(tab.text.toLowerCase())),
          }))}
        />
      </BottomBlock.Header>
      <BottomBlock.Content>
        {filteredList.length === 0 ? (
          <NoData hint={t('Nothing was logged at this level.')} />
        ) : (
          <VList ref={_list} itemSize={25} data={filteredList}>
            {(log, index) => (
              <ConsoleRow
                key={log.time + index}
                log={log}
                jump={jump}
                showSingleTab
                sessionId=""
              />
            )}
          </VList>
        )}
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(SpotConsole);
