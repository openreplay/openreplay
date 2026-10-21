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

  // the shown tab's surface, measured: tabs are as wide as their titles
  const strip = React.useRef<HTMLDivElement>(null);
  const shownId = shownTabs.length === 1 ? shownTabs[0].tab : currentTab;
  const [thumb, setThumb] = React.useState<{ x: number; w: number } | null>(
    null,
  );
  const [live, setLive] = React.useState(false);
  React.useLayoutEffect(() => {
    const host = strip.current;
    if (!host) return undefined;
    const measure = () => {
      const el = host.querySelector<HTMLElement>(
        `[data-tab="${CSS.escape(shownId)}"]`,
      );
      setThumb(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
    };
    measure();
    // a reflow is not a switch: reposition without the travel
    const ro = new ResizeObserver(() => {
      setLive(false);
      measure();
      requestAnimationFrame(() => setLive(true));
    });
    ro.observe(host);
    const id = requestAnimationFrame(() => setLive(true));
    return () => {
      ro.disconnect();
      cancelAnimationFrame(id);
    };
  }, [shownId, shownTabs.length]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const n = shownTabs.length;
    const i = shownTabs.findIndex((el) => el.tab === shownId);
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? n - 1
          : e.key === 'ArrowRight'
            ? (i + 1) % n
            : (i - 1 + n) % n;
    const tab = shownTabs[next];
    if (!tab) return;
    e.preventDefault();
    // the transport's own arrows seek; a key spent on the tabs must not
    e.stopPropagation();
    changeTab(tab.tab);
    strip.current
      ?.querySelector<HTMLElement>(`[data-tab="${CSS.escape(tab.tab)}"]`)
      ?.focus();
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
    <div
      className="m-rtabs"
      role="tablist"
      aria-label={t('Browser tabs')}
      ref={strip}
      onKeyDown={onKeyDown}
    >
      {thumb && (
        <span
          className={`m-rtabs__thumb m-travel${live ? ' is-live' : ''}`}
          aria-hidden="true"
          style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }}
        />
      )}
      {shownTabs.map((tab) => (
        <Tab
          key={tab.tab}
          i={tab.idx}
          tab={tab.tab}
          currentTab={shownId}
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
