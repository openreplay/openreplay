import { ResourceType, Timed } from 'Player';
import MobilePlayer from 'Player/mobile/IOSPlayer';
import WebPlayer from 'Player/web/WebPlayer';
import { observer } from 'mobx-react-lite';
import React, { useMemo, useState } from 'react';

import { useModal } from 'App/components/Modal';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { formatMs } from 'App/date';
import { useStore } from 'App/mstore';
import { formatBytes } from 'App/utils';
import { Icon, NoContent, Tabs } from 'UI';
import { Tooltip, Input, Switch, Form } from 'antd';
import { SearchOutlined, InfoCircleOutlined } from '@ant-design/icons';

import FetchDetailsModal from 'Shared/FetchDetailsModal';
import { WsChannel } from 'App/player/web/messages';

import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import TabSelector from '../TabSelector';
import TimeTable from '../TimeTable';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import { useRegExListFilterMemo, useTabListFilterMemo } from '../useListFilter';
import WSPanel from './WSPanel';

const INDEX_KEY = 'network';

const ALL = 'ALL';
const XHR = 'xhr';
const JS = 'js';
const CSS = 'css';
const IMG = 'img';
const MEDIA = 'media';
const OTHER = 'other';
const WS = 'websocket';

const TYPE_TO_TAB = {
  [ResourceType.XHR]: XHR,
  [ResourceType.FETCH]: XHR,
  [ResourceType.SCRIPT]: JS,
  [ResourceType.CSS]: CSS,
  [ResourceType.IMG]: IMG,
  [ResourceType.MEDIA]: MEDIA,
  [ResourceType.WS]: WS,
  [ResourceType.OTHER]: OTHER,
};

const TAP_KEYS = [ALL, XHR, JS, CSS, IMG, MEDIA, OTHER, WS] as const;
export const NETWORK_TABS = TAP_KEYS.map((tab) => ({
  text: tab === 'xhr' ? 'Fetch/XHR' : tab,
  key: tab,
}));

const DOM_LOADED_TIME_COLOR = 'teal';
const LOAD_TIME_COLOR = 'red';

export function renderType(r: any) {
  return (
    <Tooltip style={{ width: '100%' }} title={<div>{r.type}</div>}>
      <div>{r.type}</div>
    </Tooltip>
  );
}

export function renderName(r: any) {
  return (
    <Tooltip style={{ width: '100%' }} title={<div>{r.url}</div>}>
      <div>{r.name}</div>
    </Tooltip>
  );
}

function renderSize(r: any) {
  if (r.responseBodySize) return formatBytes(r.responseBodySize);
  let triggerText;
  let content;
  if (r.decodedBodySize == null || r.decodedBodySize === 0) {
    triggerText = 'x';
    content = 'Not captured';
  } else {
    const headerSize = r.headerSize || 0;
    const showTransferred = r.headerSize != null;

    triggerText = formatBytes(r.decodedBodySize);
    content = (
      <ul>
        {showTransferred && (
          <li>{`${formatBytes(
            r.encodedBodySize + headerSize
          )} transferred over network`}</li>
        )}
        <li>{`Resource size: ${formatBytes(r.decodedBodySize)} `}</li>
      </ul>
    );
  }

  return (
    <Tooltip style={{ width: '100%' }} title={content}>
      <div>{triggerText}</div>
    </Tooltip>
  );
}

export function renderDuration(r: any) {
  if (!r.success) return 'x';

  const text = `${Math.floor(r.duration)}ms`;
  if (!r.isRed && !r.isYellow) return text;

  let tooltipText;
  if (r.isYellow) {
    tooltipText = 'Slower than average';
  } else {
    tooltipText = 'Much slower than average';
  }

  return (
    <Tooltip style={{ width: '100%' }} title={tooltipText}>
      <div> {text} </div>
    </Tooltip>
  );
}

function renderStatus({
  status,
  cached,
  error,
}: {
  status: string;
  cached: boolean;
  error?: string;
}) {
  const displayedStatus = error ? (
    <Tooltip title={error}>
      <div
        style={{ width: 90 }}
        className={'overflow-hidden overflow-ellipsis'}
      >
        {error}
      </div>
    </Tooltip>
  ) : (
    status
  );
  return (
    <>
      {cached ? (
        <Tooltip title={'Served from cache'} placement="top">
          <div className="flex items-center">
            <span className="mr-1">{displayedStatus}</span>
            <Icon name="wifi" size={16} />
          </div>
        </Tooltip>
      ) : (
        displayedStatus
      )}
    </>
  );
}

function NetworkPanelCont({ panelHeight }: { panelHeight: number }) {
  const { player, store } = React.useContext(PlayerContext);
  const { sessionStore, uiPlayerStore } = useStore();

  const startedAt = sessionStore.current.startedAt;
  const {
    domContentLoadedTime,
    loadTime,
    domBuildingTime,
    tabStates,
    currentTab,
    tabNames,
  } = store.get();
  const tabsArr = Object.keys(tabStates);
  const tabValues = Object.values(tabStates);
  const dataSource = uiPlayerStore.dataSource;
  const showSingleTab = dataSource === 'current';
  const {
    fetchList = [],
    resourceList = [],
    fetchListNow = [],
    resourceListNow = [],
    websocketList = [],
    websocketListNow = [],
  } = React.useMemo(() => {
    if (showSingleTab) {
      return tabStates[currentTab] ?? {};
    } else {
      const fetchList = tabValues.flatMap((tab) => tab.fetchList);
      const resourceList = tabValues.flatMap((tab) => tab.resourceList);
      const fetchListNow = tabValues
        .flatMap((tab) => tab.fetchListNow)
        .filter(Boolean);
      const resourceListNow = tabValues
        .flatMap((tab) => tab.resourceListNow)
        .filter(Boolean);
      const websocketList = tabValues.flatMap((tab) => tab.websocketList);
      const websocketListNow = tabValues
        .flatMap((tab) => tab.websocketListNow)
        .filter(Boolean);
      return {
        fetchList,
        resourceList,
        fetchListNow,
        resourceListNow,
        websocketList,
        websocketListNow,
      };
    }
  }, [currentTab, tabStates, dataSource, tabValues]);
  const getTabNum = (tab: string) => tabsArr.findIndex((t) => t === tab) + 1;
  const getTabName = (tabId: string) => tabNames[tabId]
  return (
    <NetworkPanelComp
      loadTime={loadTime}
      panelHeight={panelHeight}
      domBuildingTime={domBuildingTime}
      domContentLoadedTime={domContentLoadedTime}
      fetchList={fetchList}
      resourceList={resourceList}
      fetchListNow={fetchListNow}
      resourceListNow={resourceListNow}
      player={player}
      startedAt={startedAt}
      websocketList={websocketList as WSMessage[]}
      websocketListNow={websocketListNow as WSMessage[]}
      getTabNum={getTabNum}
      getTabName={getTabName}
      showSingleTab={showSingleTab}
    />
  );
}

function MobileNetworkPanelCont({ panelHeight }: { panelHeight: number }) {
  const { player, store } = React.useContext(MobilePlayerContext);
  const { uiPlayerStore, sessionStore } = useStore();
  const startedAt = sessionStore.current.startedAt;
  const zoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const zoomStartTs = uiPlayerStore.timelineZoom.startTs;
  const zoomEndTs = uiPlayerStore.timelineZoom.endTs;
  const domContentLoadedTime = undefined;
  const loadTime = undefined;
  const domBuildingTime = undefined;
  const {
    fetchList = [],
    resourceList = [],
    fetchListNow = [],
    resourceListNow = [],
    websocketList = [],
    websocketListNow = [],
  } = store.get();

  return (
    <NetworkPanelComp
      isMobile
      panelHeight={panelHeight}
      loadTime={loadTime}
      domBuildingTime={domBuildingTime}
      domContentLoadedTime={domContentLoadedTime}
      fetchList={fetchList}
      resourceList={resourceList}
      fetchListNow={fetchListNow}
      resourceListNow={resourceListNow}
      player={player}
      startedAt={startedAt}
      // @ts-ignore
      websocketList={websocketList}
      // @ts-ignore
      websocketListNow={websocketListNow}
      zoomEnabled={zoomEnabled}
      zoomStartTs={zoomStartTs}
      zoomEndTs={zoomEndTs}
    />
  );
}

type WSMessage = Timed & {
  channelName: string;
  data: string;
  timestamp: number;
  dir: 'up' | 'down';
  messageType: string;
};

interface Props {
  domContentLoadedTime?: {
    time: number;
    value: number;
  };
  loadTime?: {
    time: number;
    value: number;
  };
  domBuildingTime?: number;
  fetchList: Timed[];
  resourceList: Timed[];
  fetchListNow: Timed[];
  resourceListNow: Timed[];
  websocketList: Array<WSMessage>;
  websocketListNow: Array<WSMessage>;
  player: WebPlayer | MobilePlayer;
  startedAt: number;
  isMobile?: boolean;
  zoomEnabled?: boolean;
  zoomStartTs?: number;
  zoomEndTs?: number;
  panelHeight: number;
  onClose?: () => void;
  activeOutsideIndex?: number;
  isSpot?: boolean;
  getTabNum?: (tab: string) => number;
  getTabName?: (tabId: string) => string;
  showSingleTab?: boolean;
}

export const NetworkPanelComp = observer(
  ({
    loadTime,
    domBuildingTime,
    domContentLoadedTime,
    fetchList,
    resourceList,
    fetchListNow,
    resourceListNow,
    player,
    startedAt,
    isMobile,
    panelHeight,
    websocketList,
    zoomEnabled,
    zoomStartTs,
    zoomEndTs,
    onClose,
    activeOutsideIndex,
    isSpot,
    getTabNum,
    showSingleTab,
    getTabName,
  }: Props) => {
    const [selectedWsChannel, setSelectedWsChannel] = React.useState<
      WsChannel[] | null
    >(null);
    const { showModal } = useModal();
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);

    const [isDetailsModalActive, setIsDetailsModalActive] = useState(false);
    const {
      sessionStore: { devTools },
    } = useStore();
    const filter = devTools[INDEX_KEY].filter;
    const activeTab = devTools[INDEX_KEY].activeTab;
    const activeIndex = activeOutsideIndex ?? devTools[INDEX_KEY].index;

    const socketList = useMemo(
      () =>
        websocketList.filter(
          (ws, i, arr) =>
            arr.findIndex((it) => it.channelName === ws.channelName) === i
        ),
      [websocketList]
    );

    const list = useMemo(
      () =>
        // TODO: better merge (with body size info) - do it in player
        resourceList
          .filter(
            (res) =>
              !fetchList.some((ft) => {
                // res.url !== ft.url doesn't work on relative URLs appearing within fetchList (to-fix in player)
                if (res.name === ft.name) {
                  if (res.time === ft.time) return true;
                  if (res.url.includes(ft.url)) {
                    return (
                      Math.abs(res.time - ft.time) < 350 ||
                      Math.abs(res.timestamp - ft.timestamp) < 350
                    );
                  }
                }

                if (res.name !== ft.name) {
                  return false;
                }
                if (Math.abs(res.time - ft.time) > 250) {
                  return false;
                } // TODO: find good epsilons
                if (Math.abs(res.duration - ft.duration) > 200) {
                  return false;
                }

                return true;
              })
          )
          .concat(fetchList)
          .concat(
            socketList.map((ws) => ({
              ...ws,
              type: 'websocket',
              method: 'ws',
              url: ws.channelName,
              name: ws.channelName,
              status: '101',
              duration: 0,
              transferredBodySize: 0,
            }))
          )
          .filter((req) =>
            zoomEnabled
              ? req.time >= zoomStartTs! && req.time <= zoomEndTs!
              : true
          )
          .sort((a, b) => a.time - b.time),
      [resourceList.length, fetchList.length, socketList]
    );

    let filteredList = useMemo(() => {
      if (!showOnlyErrors) {
        return list;
      }
      return list.filter(
        (it) => parseInt(it.status) >= 400 || !it.success || it.error
      );
    }, [showOnlyErrors, list]);
    filteredList = useRegExListFilterMemo(
      filteredList,
      (it) => [it.status, it.name, it.type, it.method],
      filter
    );
    filteredList = useTabListFilterMemo(
      filteredList,
      (it) => TYPE_TO_TAB[it.type],
      ALL,
      activeTab
    );

    const onTabClick = (activeTab: (typeof TAP_KEYS)[number]) =>
      devTools.update(INDEX_KEY, { activeTab });
    const onFilterChange = ({
      target: { value },
    }: React.ChangeEvent<HTMLInputElement>) =>
      devTools.update(INDEX_KEY, { filter: value });

    // AutoScroll
    const [timeoutStartAutoscroll, stopAutoscroll] = useAutoscroll(
      filteredList,
      getLastItemTime(fetchListNow, resourceListNow),
      activeIndex,
      (index) => devTools.update(INDEX_KEY, { index })
    );
    const onMouseEnter = stopAutoscroll;
    const onMouseLeave = () => {
      if (isDetailsModalActive) {
        return;
      }
      timeoutStartAutoscroll();
    };

    const resourcesSize = useMemo(
      () =>
        resourceList.reduce(
          (sum, { decodedBodySize }) => sum + (decodedBodySize || 0),
          0
        ),
      [resourceList.length]
    );
    const transferredSize = useMemo(
      () =>
        resourceList.reduce(
          (sum, { headerSize, encodedBodySize }) =>
            sum + (headerSize || 0) + (encodedBodySize || 0),
          0
        ),
      [resourceList.length]
    );

    const referenceLines = useMemo(() => {
      const arr = [];

      if (domContentLoadedTime != null) {
        arr.push({
          time: domContentLoadedTime.time,
          color: DOM_LOADED_TIME_COLOR,
        });
      }
      if (loadTime != null) {
        arr.push({
          time: loadTime.time,
          color: LOAD_TIME_COLOR,
        });
      }

      return arr;
    }, [domContentLoadedTime, loadTime]);

    const showDetailsModal = (item: any) => {
      if (item.type === 'websocket') {
        const socketMsgList = websocketList.filter(
          (ws) => ws.channelName === item.channelName
        );

        return setSelectedWsChannel(socketMsgList);
      }
      setIsDetailsModalActive(true);
      showModal(
        <FetchDetailsModal
          isSpot={isSpot}
          time={item.time + startedAt}
          resource={item}
          rows={filteredList}
          fetchPresented={fetchList.length > 0}
        />,
        {
          right: true,
          width: 500,
          onClose: () => {
            setIsDetailsModalActive(false);
            timeoutStartAutoscroll();
          },
        }
      );
      devTools.update(INDEX_KEY, { index: filteredList.indexOf(item) });
      stopAutoscroll();
    };

    const tableCols = React.useMemo(() => {
      const cols: any[] = [
        {
          label: 'Status',
          dataKey: 'status',
          width: 90,
          render: renderStatus,
        },
        {
          label: 'Type',
          dataKey: 'type',
          width: 90,
          render: renderType,
        },
        {
          label: 'Method',
          width: 80,
          dataKey: 'method',
        },
        {
          label: 'Name',
          width: 240,
          dataKey: 'name',
          render: renderName,
        },
        {
          label: 'Size',
          width: 80,
          dataKey: 'decodedBodySize',
          render: renderSize,
          hidden: activeTab === XHR,
        },
        {
          label: 'Duration',
          width: 80,
          dataKey: 'duration',
          render: renderDuration,
        },
      ];
      if (!showSingleTab) {
        cols.unshift({
          label: 'Source',
          width: 64,
          render: (r: Record<string, any>) => (
            <Tooltip title={`${getTabName?.(r.tabId) ?? `Tab ${getTabNum?.(r.tabId) ?? 0}`}`} placement="left">
              <div className="bg-gray-light rounded-full min-w-5 min-h-5 w-5 h-5 flex items-center justify-center text-xs cursor-default">
                {getTabNum?.(r.tabId) ?? 0}
              </div>
            </Tooltip>
          ),
        });
      }
      return cols;
    }, [showSingleTab]);

    return (
      <BottomBlock
        style={{ height: '100%' }}
        className="border"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <BottomBlock.Header onClose={onClose}>
          <div className="flex items-center">
            <span className="font-semibold color-gray-medium mr-4">
              Network
            </span>
            {isMobile ? null : (
              <Tabs
                className="uppercase"
                tabs={NETWORK_TABS}
                active={activeTab}
                onClick={onTabClick}
                border={false}
              />
            )}
          </div>
          <div className={'flex items-center gap-2'}>
            {!isMobile ? <TabSelector /> : null}
            <Input
              className="rounded-lg"
              placeholder="Filter by name, type, method or value"
              name="filter"
              onChange={onFilterChange}
              width={280}
              value={filter}
              size="small"
              prefix={<SearchOutlined className="text-neutral-400" />}
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <div className="flex items-center justify-between px-4 border-b bg-teal/5 h-8">
            <div>
              <Form.Item name="show-errors-only" className="mb-0">
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Switch
                    checked={showOnlyErrors}
                    onChange={() => setShowOnlyErrors(!showOnlyErrors)}
                    size="small"
                  />
                  <span className="text-sm ms-2">4xx-5xx Only</span>
                </label>
              </Form.Item>
            </div>
            <InfoLine>
              <InfoLine.Point
                label={filteredList.length + ''}
                value=" requests"
              />
              <InfoLine.Point
                label={formatBytes(transferredSize)}
                value="transferred"
                display={transferredSize > 0}
              />
              <InfoLine.Point
                label={formatBytes(resourcesSize)}
                value="resources"
                display={resourcesSize > 0}
              />
              <InfoLine.Point
                label={formatMs(domBuildingTime)}
                value="DOM Building Time"
                display={domBuildingTime != null}
              />
              <InfoLine.Point
                label={
                  domContentLoadedTime && formatMs(domContentLoadedTime.value)
                }
                value="DOMContentLoaded"
                display={domContentLoadedTime != null}
                dotColor={DOM_LOADED_TIME_COLOR}
              />
              <InfoLine.Point
                label={loadTime && formatMs(loadTime.value)}
                value="Load"
                display={loadTime != null}
                dotColor={LOAD_TIME_COLOR}
              />
            </InfoLine>
          </div>
          <NoContent
            title={
              <div className="capitalize flex items-center gap-2">
                <InfoCircleOutlined size={18} />
                No Data
              </div>
            }
            size="small"
            show={filteredList.length === 0}
          >
            {/*@ts-ignore*/}
            <TimeTable
              rows={filteredList}
              tableHeight={panelHeight - 102}
              referenceLines={referenceLines}
              renderPopup
              onRowClick={showDetailsModal}
              sortBy={'time'}
              sortAscending
              onJump={(row: any) => {
                devTools.update(INDEX_KEY, {
                  index: filteredList.indexOf(row),
                });
                player.jump(row.time);
              }}
              activeIndex={activeIndex}
            >
              {tableCols}
            </TimeTable>
            {selectedWsChannel ? (
              <WSPanel
                socketMsgList={selectedWsChannel}
                onClose={() => setSelectedWsChannel(null)}
              />
            ) : null}
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    );
  }
);

const WebNetworkPanel = observer(NetworkPanelCont);

const MobileNetworkPanel = observer(MobileNetworkPanelCont);

export { WebNetworkPanel, MobileNetworkPanel };
