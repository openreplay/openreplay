import { observer } from 'mobx-react-lite';
import React from 'react';
import { VList, VListHandle } from 'virtua';

import BottomBlock from 'Components/shared/DevTools/BottomBlock';
import {
  TABS,
  getIconProps,
  renderWithNL,
} from 'Components/shared/DevTools/ConsolePanel/ConsolePanel';
import ConsoleRow from 'Components/shared/DevTools/ConsoleRow';
import { Icon, NoContent, Tabs } from 'UI';

import spotPlayerStore from '../../spotPlayerStore';
import { useTranslation } from 'react-i18next';

function SpotConsole({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState(TABS[0]);
  const _list = React.useRef<VListHandle>(null);

  const onTabClick = (tab: string) => {
    const newTab = TABS.find((t) => t.text === tab);
    setActiveTab(newTab);
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
        <div className="flex items-center">
          <span className="font-semibold color-gray-medium mr-4">
            {t('Console')}
          </span>
          <Tabs
            tabs={TABS}
            active={activeTab}
            onClick={onTabClick}
            border={false}
          />
        </div>
      </BottomBlock.Header>
      <BottomBlock.Content className="overflow-y-auto">
        <NoContent
          title={
            <div className="capitalize flex items-center">
              <Icon name="info-circle" className="mr-2" size="18" />
              {t('No Data')}
            </div>
          }
          size="small"
          show={filteredList.length === 0}
        >
          <VList ref={_list} itemSize={25} count={filteredList.length || 1}>
            {filteredList.map((log, index) => (
              <ConsoleRow
                key={log.time + index}
                log={log}
                jump={jump}
                iconProps={getIconProps(log.level)}
                renderWithNL={renderWithNL}
                showSingleTab
              />
            ))}
          </VList>
        </NoContent>
      </BottomBlock.Content>
    </BottomBlock>
  );
}

export default observer(SpotConsole);
