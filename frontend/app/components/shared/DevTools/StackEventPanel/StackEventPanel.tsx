import { Timed } from 'Player';
import { typeList } from 'Types/session/stackEvent';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { VList, VListHandle } from 'virtua';

import { useModal } from 'App/components/Modal';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { capitalize } from 'App/utils';

import StackEventRow from 'Shared/DevTools/StackEventRow';

import BottomBlock from '../BottomBlock';
import { Keyword, NoData, PanelTabs } from '../PanelKit';
import StackEventModal from '../StackEventModal';
import TabSelector from '../TabSelector';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import { useRegExListFilterMemo, useTabListFilterMemo } from '../useListFilter';

const mapNames = (type: string) => {
  if (type === 'openreplay') return 'OpenReplay';
  return type;
};

const INDEX_KEY = 'stackEvent';
const ALL = 'ALL';
const TAB_KEYS = [ALL, ...typeList] as const;
const TABS = TAB_KEYS.map((tab) => ({ text: tab, key: tab }));

interface Event extends Timed {
  name: string;
  source: string;
  key: string;
  payload?: string[];
  tabName?: string;
  tabNum?: number;
}

type EventsList = Array<Event>;

const WebStackEventPanelComp = observer(() => {
  const { uiPlayerStore } = useStore();
  const source = uiPlayerStore.dataSource;
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const { player, store } = React.useContext(PlayerContext);
  const jump = (t: number) => player.jump(t);
  const { currentTab, tabStates, tabNames } = store.get();
  const tabsArr = Object.keys(tabStates);
  const getTabNum = (tab: string) =>
    tabsArr.length > 1 ? tabsArr.findIndex((t) => t === tab) + 1 : undefined;

  const { stackList: list = [], stackListNow: listNow = [] } =
    tabStates[currentTab] ?? {};

  const eventsList: EventsList = React.useMemo(() => {
    const evList: EventsList = [];
    list.forEach((ev) => {
      const tabId = player.getMessageTab(ev);
      const tabName = tabId ? tabNames[tabId] : undefined;
      const tabNum = tabId ? getTabNum(tabId) : undefined;
      const event = { ...ev, tabName, tabNum } as unknown as Event;
      if (source === 'all') {
        evList.push(event);
      } else if (tabId === currentTab) {
        evList.push(event);
      }
    });
    return evList;
  }, [source, list.length]);
  const eventsListNow: EventsList = React.useMemo(() => {
    const evListNow: EventsList = [];
    listNow.forEach((ev) => {
      const tabId = player.getMessageTab(ev);
      const tabName = tabId ? tabNames[tabId] : undefined;
      const tabNum = tabId ? getTabNum(tabId) : undefined;
      const event = { ...ev, tabName, tabNum } as unknown as Event;
      if (source === 'all') {
        evListNow.push(event);
      } else if (tabId === currentTab) {
        evListNow.push(event);
      }
    });
    return evListNow;
  }, [source, listNow.length]);
  return (
    <EventsPanel
      list={eventsList}
      listNow={eventsListNow}
      jump={jump}
      zoomEnabled={zoomEnabled}
      zoomStartTs={zoomStartTs}
      zoomEndTs={zoomEndTs}
      showTabScope
    />
  );
});

export const WebStackEventPanel = WebStackEventPanelComp;

const MobileStackEventPanelComp = observer(() => {
  const { uiPlayerStore } = useStore();
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const { player, store } = React.useContext(MobilePlayerContext);
  const jump = (t: number) => player.jump(t);
  const { eventList: list = [], eventListNow: listNow = [] } = store.get();

  return (
    <EventsPanel
      list={list as EventsList}
      listNow={listNow as EventsList}
      jump={jump}
      isMobile
      zoomEnabled={zoomEnabled}
      zoomStartTs={zoomStartTs}
      zoomEndTs={zoomEndTs}
    />
  );
});

export const MobileStackEventPanel = MobileStackEventPanelComp;

const EventsPanel = observer(
  ({
    list,
    listNow,
    jump,
    zoomEnabled,
    zoomStartTs,
    zoomEndTs,
    showTabScope,
  }: {
    list: EventsList;
    listNow: EventsList;
    jump: (t: number) => void;
    zoomEnabled: boolean;
    zoomStartTs: number;
    zoomEndTs: number;
    isMobile?: boolean;
    showTabScope?: boolean;
  }) => {
    const { t } = useTranslation();
    const {
      sessionStore: { devTools },
    } = useStore();
    const { showModal } = useModal();
    const [isDetailsModalActive, setIsDetailsModalActive] = useState(false); // TODO:embed that into useModal
    const { filter } = devTools[INDEX_KEY];
    const { activeTab } = devTools[INDEX_KEY];
    const activeIndex = devTools[INDEX_KEY].index;

    const inZoomRangeList = list.filter(({ time }) =>
      zoomEnabled ? zoomStartTs <= time && time <= zoomEndTs : true,
    );
    const inZoomRangeListNow = listNow.filter(({ time }) =>
      zoomEnabled ? zoomStartTs <= time && time <= zoomEndTs : true,
    );

    let filteredList = useRegExListFilterMemo(
      inZoomRangeList,
      (it) => {
        const searchBy = [it.name];
        if (it.payload) {
          const payload = Array.isArray(it.payload)
            ? it.payload.join(',')
            : JSON.stringify(it.payload);
          searchBy.push(payload);
        }
        return searchBy;
      },
      filter,
    );
    filteredList = useTabListFilterMemo(
      filteredList,
      (it) => it.source,
      ALL,
      activeTab,
    );

    const onTabClick = (activeTab: (typeof TAB_KEYS)[number]) =>
      devTools.update(INDEX_KEY, { activeTab });
    const onFilterChange = (value: string) =>
      devTools.update(INDEX_KEY, { filter: value });
    const tabs = useMemo(
      () =>
        TABS.filter(
          ({ key }) =>
            key === ALL || inZoomRangeList.some(({ source }) => key === source),
        ),
      [inZoomRangeList.length],
    );

    const [timeoutStartAutoscroll, stopAutoscroll] = useAutoscroll(
      filteredList,
      getLastItemTime(inZoomRangeListNow),
      activeIndex,
      (index) => devTools.update(INDEX_KEY, { index }),
    );
    const onMouseEnter = stopAutoscroll;
    const onMouseLeave = () => {
      if (isDetailsModalActive) {
        return;
      }
      timeoutStartAutoscroll();
    };

    const showDetails = (item: any) => {
      setIsDetailsModalActive(true);
      showModal(<StackEventModal event={item} />, {
        right: true,
        onClose: () => {
          setIsDetailsModalActive(false);
          timeoutStartAutoscroll();
        },
      });
      devTools.update(INDEX_KEY, { index: filteredList.indexOf(item) });
      stopAutoscroll();
    };

    const _list = React.useRef<VListHandle>(null);
    useEffect(() => {
      if (_list.current) {
        _list.current.scrollToIndex(activeIndex);
      }
    }, [activeIndex]);

    return (
      <BottomBlock
        style={{ height: '100%' }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <BottomBlock.Header>
          <PanelTabs
            label={t('Event source')}
            active={activeTab}
            onSelect={onTabClick as (k: string) => void}
            items={tabs.map(({ key }) => ({
              key,
              label: key === ALL ? t('All') : capitalize(mapNames(key)),
              count:
                key === ALL
                  ? inZoomRangeList.length
                  : inZoomRangeList.filter((e) => e.source === key).length,
            }))}
          />
          <div className="m-dt__bar-right">
            {showTabScope ? <TabSelector /> : null}
            <Keyword value={filter} onChange={onFilterChange} />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          {filteredList.length === 0 ? (
            <NoData
              hint={
                filter
                  ? t('No event matches that.')
                  : t(
                      'Nothing was sent with tracker.event() and no integration reported here.',
                    )
              }
            />
          ) : (
            <VList ref={_list} data={filteredList}>
              {(item, index) => (
                <StackEventRow
                  isActive={activeIndex === index}
                  key={item.key}
                  event={item}
                  onJump={() => {
                    stopAutoscroll();
                    devTools.update(INDEX_KEY, {
                      index: filteredList.indexOf(item),
                    });
                    jump(item.time);
                  }}
                  onClick={() => showDetails(item)}
                />
              )}
            </VList>
          )}
        </BottomBlock.Content>
      </BottomBlock>
    );
  },
);
