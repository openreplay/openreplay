import React from 'react';
import { observer } from 'mobx-react-lite';
import cn from 'classnames';
import Tab from './Tab';
import { PlayerContext } from 'Components/Session/playerContext';
import { useModal } from 'Components/Modal';

interface Props {
  tabs: { tab: string; idx: number }[];
  currentTab: string;
  changeTab: (tab: string) => void;
  hideModal: () => void;
}

function Modal({ tabs, currentTab, changeTab, hideModal }: Props) {
  return (
    <div className={'h-screen overflow-y-scroll'}>
      <div className={'text-2xl font-semibold p-4'}>{tabs.length} Tabs</div>
      {tabs.map((tab, i) => (
        <div
          key={tab.idx}
          onClick={() => {
            changeTab(tab.tab);
            hideModal();
          }}
          className={cn(
            currentTab === tab.tab ? 'font-semibold ' : 'text-disabled-text',
            'cursor-pointer border-b p-4 hover:bg-active-blue'
          )}
        >
          Tab {i + 1}
        </div>
      ))}
    </div>
  );
}

function SessionTabs({ isLive }: { isLive?: boolean }) {
  const { showModal, hideModal } = useModal();
  const { player, store } = React.useContext(PlayerContext);
  const { tabs = new Set('back-compat'), currentTab } = store.get();

  const tabsArr = Array.from(tabs).map((tab, idx) => ({ tab, idx }));
  const shouldTruncate = tabsArr.length > 10;
  const actualTabs = shouldTruncate ? tabsArr.slice(0, 10) : tabsArr;

  const shownTabs =
    actualTabs.findIndex((el) => el.tab === currentTab) !== -1
      ? actualTabs
      : actualTabs.concat({
          tab: currentTab,
          idx: tabsArr.findIndex((tEl) => tEl.tab === currentTab),
        });
  const changeTab = (tab: string) => {
    if (isLive) return;
    player.changeTab(tab);
  };

  const openModal = () => {
    showModal(
      <Modal hideModal={hideModal} currentTab={currentTab} changeTab={changeTab} tabs={tabsArr} />,
      {
        right: true,
      }
    );
  };
  return (
    <>
      {shownTabs.map((tab, i) => (
        <React.Fragment key={tab.tab}>
          <Tab
            i={tab.idx}
            tab={tab.tab}
            currentTab={actualTabs.length === 1 ? tab.tab : currentTab}
            changeTab={changeTab}
            isLive={isLive}
          />
        </React.Fragment>
      ))}
      {shouldTruncate ? (
        <>
          {tabsArr.length > 11 ? (
            <div
              onClick={openModal}
              className={cn(
                'self-end py-1 px-4 text-sm',
                'cursor-pointer bg-active-blue text-blue',
                '!border-t-transparent !border-l-transparent !border-r-transparent'
              )}
            >
              +{tabsArr.length - 11} More
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}

export default observer(SessionTabs);
