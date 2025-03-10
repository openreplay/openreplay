import { Timed } from 'Player';
import React, { useEffect, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Tabs, NoContent, Icon } from 'UI';
import { Input, Segmented, Tooltip } from 'antd';
import { SearchOutlined, InfoCircleOutlined } from '@ant-design/icons';
import {
  PlayerContext,
  MobilePlayerContext,
} from 'App/components/Session/playerContext';
import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { typeList } from 'Types/session/stackEvent';
import StackEventRow from 'Shared/DevTools/StackEventRow';

import { VList, VListHandle } from 'virtua';
import StackEventModal from '../StackEventModal';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import BottomBlock from '../BottomBlock';
import { useRegExListFilterMemo, useTabListFilterMemo } from '../useListFilter';
import { useTranslation } from 'react-i18next';

const mapNames = (type: string) => {
  if (type === 'openreplay') return 'OpenReplay';
  return type;
};

const INDEX_KEY = 'stackEvent';
const ALL = 'ALL';
const TAB_KEYS = [ALL, ...typeList] as const;
const TABS = TAB_KEYS.map((tab) => ({ text: tab, key: tab }));

type EventsList = Array<
  Timed & { name: string; source: string; key: string; payload?: string[] }
>;

const WebStackEventPanelComp = observer(() => {
  const { uiPlayerStore } = useStore();
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const { player, store } = React.useContext(PlayerContext);
  const jump = (t: number) => player.jump(t);
  const { currentTab, tabStates } = store.get();

  const { stackList: list = [], stackListNow: listNow = [] } =
    tabStates[currentTab];

  return (
    <EventsPanel
      list={list as EventsList}
      listNow={listNow as EventsList}
      jump={jump}
      zoomEnabled={zoomEnabled}
      zoomStartTs={zoomStartTs}
      zoomEndTs={zoomEndTs}
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
    isMobile,
  }: {
    list: EventsList;
    listNow: EventsList;
    jump: (t: number) => void;
    zoomEnabled: boolean;
    zoomStartTs: number;
    zoomEndTs: number;
    isMobile?: boolean;
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
    const onFilterChange = ({
      target: { value },
    }: React.ChangeEvent<HTMLInputElement>) =>
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
        width: 500,
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
          <div className="flex items-center">
            <span className="font-semibold color-gray-medium mr-4">
              {t('Stack Events')}
            </span>
            <Tabs
              renameTab={mapNames}
              tabs={tabs}
              active={activeTab}
              onClick={onTabClick}
              border={false}
            />
          </div>
          <div className="flex items-center gap-2">
            {isMobile ? null : (
              <Segmented
                options={[
                  { label: 'All Tabs', value: 'all' },
                  {
                    label: (
                      <Tooltip title={t('Stack Events overview is available only for all tabs combined.')}>
                        <span>{t('Current Tab')}</span>
                      </Tooltip>
                    ),
                    value: 'current',
                    disabled: true,
                  },
                ]}
                defaultValue="all"
                size="small"
                className="rounded-full font-medium"
              />
            )}
            <Input
              className="rounded-lg"
              placeholder="Filter by keyword"
              name="filter"
              height={28}
              onChange={onFilterChange}
              value={filter}
              size="small"
              prefix={<SearchOutlined className="text-neutral-400" />}
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content className="overflow-y-auto">
          <NoContent
            title={
              <div className="capitalize flex items-center mt-16 gap-2">
                <InfoCircleOutlined size={18} />
                {t('No Data')}
              </div>
            }
            size="small"
            show={filteredList.length === 0}
          >
            <VList ref={_list} count={filteredList.length || 1}>
              {filteredList.map((item, index) => (
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
              ))}
            </VList>
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    );
  },
);
