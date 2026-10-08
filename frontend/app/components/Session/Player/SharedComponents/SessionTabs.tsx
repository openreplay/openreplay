import cn from 'classnames';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'Components/Modal';
import { PlayerContext } from 'Components/Session/playerContext';

import Tab from './Tab';

interface Props {
  tabs: { tab: string; idx: number }[];
  currentTab: string;
  changeTab: (tab: string) => void;
  hideModal: () => void;
}

const DISPLAY_LIMIT = 5;

function Modal({ tabs, currentTab, changeTab, hideModal }: Props) {
  const { t } = useTranslation();
  return (
    <div className="h-screen overflow-y-scroll">
      <div className="text-2xl font-semibold p-4">
        {tabs.length} {t('Tabs')}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.idx}
          onClick={() => {
            changeTab(tab.tab);
            hideModal();
          }}
          className={cn(
            currentTab === tab.tab ? 'font-semibold ' : 'text-content-disabled',
            'cursor-pointer border-b p-4 hover:bg-surface-hover',
          )}
        >
          {t('Tab')}&nbsp;{i + 1}
        </div>
      ))}
    </div>
  );
}

function SessionTabs({ isLive }: { isLive?: boolean }) {
  const { t } = useTranslation();
  const { showModal, hideModal } = useModal();
  const { player, store } = React.useContext(PlayerContext);
  const {
    tabs = new Set(['back-compat']),
    currentTab,
    closedTabs,
    tabNames,
  } = store.get();

  const tabsArr = Array.from(tabs).map((tab, idx) => ({
    tab,
    idx,
    isClosed: closedTabs.includes(tab),
  }));
  const shouldTruncate = tabsArr.length > DISPLAY_LIMIT;
  const actualTabs = shouldTruncate ? tabsArr.slice(0, DISPLAY_LIMIT) : tabsArr;

  // currentTab is briefly unknown while assist re-adopts a reconnected session;
  // appending it then would render a tab at index -1 ("Tab 0")
  const currentTabIdx = tabsArr.findIndex((el) => el.tab === currentTab);
  const shownTabs =
    currentTabIdx === -1 || actualTabs.some((el) => el.tab === currentTab)
      ? actualTabs
      : actualTabs.concat(tabsArr[currentTabIdx]);
  const changeTab = (tab: string) => {
    if (isLive) return;
    player.changeTab(tab);
  };

  const openModal = () => {
    showModal(
      <Modal
        hideModal={hideModal}
        currentTab={currentTab}
        changeTab={changeTab}
        tabs={tabsArr}
      />,
      {
        right: true,
      },
    );
  };
  return (
    <div className="m-rtabs" role="tablist" aria-label={t('Browser tabs')}>
      {shownTabs.map((tab) => (
        <Tab
          key={tab.tab}
          i={tab.idx}
          tab={tab.tab}
          currentTab={actualTabs.length === 1 ? tab.tab : currentTab}
          changeTab={changeTab}
          isLive={isLive}
          isClosed={tab.isClosed}
          name={tabNames[tab.tab]}
        />
      ))}
      {shouldTruncate ? (
        <button
          type="button"
          className="m-rtabs__more m-mono"
          onClick={openModal}
        >
          +{tabsArr.length - DISPLAY_LIMIT}
        </button>
      ) : null}
    </div>
  );
}

export default observer(SessionTabs);
