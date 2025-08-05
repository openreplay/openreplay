/* eslint-disable i18next/no-literal-string */
import { ResourceType, Timed } from 'Player';
import { WsChannel } from 'Player/web/messages';
import MobilePlayer from 'Player/mobile/IOSPlayer';
import WebPlayer from 'Player/web/WebPlayer';
import { observer } from 'mobx-react-lite';
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import i18n from 'App/i18n'

import { useModal } from 'App/components/Modal';
import {
  MobilePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { formatMs } from 'App/date';
import { useStore } from 'App/mstore';
import { formatBytes, debounceCall } from 'App/utils';
import { Icon, NoContent, Tabs } from 'UI';
import { Tooltip, Input, Switch, Form } from 'antd';
import {
  SearchOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

import FetchDetailsModal from 'Shared/FetchDetailsModal';

import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import TabSelector from '../TabSelector';
import TimeTable from '../TimeTable';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import WSPanel from './WSPanel';
import { useTranslation } from 'react-i18next';
import { mergeListsWithZoom, processInChunks } from './utils'

// Constants remain the same
const INDEX_KEY = 'network';
const ALL = 'ALL';
const XHR = 'xhr';
const JS = 'js';
const CSS = 'css';
const IMG = 'img';
const MEDIA = 'media';
const OTHER = 'other';
const WS = 'websocket';
const GRAPHQL = 'graphql';

const TYPE_TO_TAB = {
  [ResourceType.XHR]: XHR,
  [ResourceType.FETCH]: XHR,
  [ResourceType.SCRIPT]: JS,
  [ResourceType.CSS]: CSS,
  [ResourceType.IMG]: IMG,
  [ResourceType.MEDIA]: MEDIA,
  [ResourceType.WS]: WS,
  [ResourceType.OTHER]: OTHER,
  [ResourceType.GRAPHQL]: GRAPHQL,
};

const TAP_KEYS = [ALL, XHR, JS, CSS, IMG, MEDIA, OTHER, WS, GRAPHQL] as const;
export const NETWORK_TABS = TAP_KEYS.map((tab) => ({
  text: tab === 'xhr' ? 'Fetch/XHR' : tab,
  key: tab,
}));

const DOM_LOADED_TIME_COLOR = 'teal';
const LOAD_TIME_COLOR = 'red';

const BATCH_SIZE = 2500;
const INITIAL_LOAD_SIZE = 5000;

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
  const t = i18n.t;
  const notCaptured = t('Not captured');
  const resSizeStr = t('Resource size')
  let triggerText;
  let content;
  if (r.responseBodySize) {
    triggerText = formatBytes(r.responseBodySize);
    content = undefined;
  } else if (r.decodedBodySize == null || r.decodedBodySize === 0) {
    triggerText = 'x';
    content = notCaptured;
  } else {
    const headerSize = r.headerSize || 0;
    const showTransferred = r.headerSize != null;

    triggerText = formatBytes(r.decodedBodySize);
    content = (
      <ul>
        {showTransferred && (
          <li>
            {`${formatBytes(
              r.encodedBodySize + headerSize,
            )} transferred over network`}
          </li>
        )}
        <li>{`${resSizeStr}: ${formatBytes(r.decodedBodySize)} `}</li>
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
  const { t } = useTranslation();
  if (!r.success) return 'x';

  const text = `${Math.floor(r.duration)}ms`;
  if (!r.isRed && !r.isYellow) return text;

  let tooltipText;
  if (r.isYellow) {
    tooltipText = t('Slower than average');
  } else {
    tooltipText = t('Much slower than average');
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
  const { t } = useTranslation();
  const noInfoReq = status === 'no-info'
  const hasTooltip = cached || noInfoReq;
  let tooltipTitle = undefined;
  let icon = null;
  if (hasTooltip) {
    if (noInfoReq) {
      tooltipTitle = t('No timing information reported about this request by the browser.');
      icon = <Icon name="info-circle" size={16} />
    } else if (cached) {
      tooltipTitle = t('Served from cache')
      icon = <Icon name="wifi" size={16} />
    }
  }
  if (error) {
    tooltipTitle = error;
    icon = null;
  }
  return (
    <Tooltip title={tooltipTitle} placement="top">
      <div
        className="flex items-center gap-1 overflow-hidden overflow-ellipsis"
        style={{ width: 90 }}
      >
        <span className="mr-1">{status}</span>
        {icon}
      </div>
    </Tooltip>
  );
}


// Main component for Network Panel
function NetworkPanelCont({ panelHeight }: { panelHeight: number }) {
  const { player, store } = React.useContext(PlayerContext);
  const { sessionStore, uiPlayerStore } = useStore();

  const { startedAt } = sessionStore.current;
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
  const { dataSource } = uiPlayerStore;
  const showSingleTab = dataSource === 'current';

  let fetchList = [];
  let resourceList = [];
  let fetchListNow = [];
  let resourceListNow = [];
  let websocketList = [];
  let websocketListNow = [];

  if (showSingleTab) {
    const state = tabStates[currentTab] ?? {};
    fetchList = state.fetchList ?? [];
    resourceList = state.resourceList ?? [];
    fetchListNow = state.fetchListNow ?? [];
    resourceListNow = state.resourceListNow ?? [];
    websocketList = state.websocketList ?? [];
    websocketListNow = state.websocketListNow ?? [];
  } else {
    fetchList = tabValues.flatMap((tab) => tab.fetchList);
    resourceList = tabValues.flatMap((tab) => tab.resourceList);
    fetchListNow = tabValues.flatMap((tab) => tab.fetchListNow).filter(Boolean);
    resourceListNow = tabValues
      .flatMap((tab) => tab.resourceListNow)
      .filter(Boolean);
    websocketList = tabValues.flatMap((tab) => tab.websocketList);
    websocketListNow = tabValues
      .flatMap((tab) => tab.websocketListNow)
      .filter(Boolean);
  }

  const getTabNum = (tab: string) => tabsArr.findIndex((t) => t === tab) + 1;
  const getTabName = (tabId: string) => tabNames[tabId];

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
      websocketList={websocketList}
      websocketListNow={websocketListNow}
      getTabNum={getTabNum}
      getTabName={getTabName}
      showSingleTab={showSingleTab}
    />
  );
}

function MobileNetworkPanelCont({ panelHeight }: { panelHeight: number }) {
  const { player, store } = React.useContext(MobilePlayerContext);
  const { uiPlayerStore, sessionStore } = useStore();
  const { startedAt } = sessionStore.current;
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
      websocketList={websocketList}
      websocketListNow={websocketListNow}
      zoomEnabled={zoomEnabled}
      zoomStartTs={zoomStartTs}
      zoomEndTs={zoomEndTs}
    />
  );
}

const useInfiniteScroll = (loadMoreCallback: () => void, hasMore: boolean) => {
  const observerRef = useRef<IntersectionObserver>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore) {
          loadMoreCallback();
        }
      },
      { threshold: 0.1 },
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    // @ts-ignore
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMoreCallback, hasMore, loadingRef]);

  return loadingRef;
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
  websocketList: Array<WsChannel>;
  websocketListNow: Array<WsChannel>;
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
    const { t } = useTranslation();
    const [selectedWsChannel, setSelectedWsChannel] = React.useState<
      WsChannel[] | null
    >(null);
    const { showModal } = useModal();
    const [showOnlyErrors, setShowOnlyErrors] = useState(false);
    const [isDetailsModalActive, setIsDetailsModalActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [displayedItems, setDisplayedItems] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [summaryStats, setSummaryStats] = useState({
      resourcesSize: 0,
      transferredSize: 0,
    });

    const originalListRef = useRef([]);
    const socketListRef = useRef([]);

    const {
      sessionStore: { devTools },
    } = useStore();
    const { filter } = devTools[INDEX_KEY];
    const { activeTab } = devTools[INDEX_KEY];
    const activeIndex = activeOutsideIndex ?? devTools[INDEX_KEY].index;
    const [inputFilterValue, setInputFilterValue] = useState(filter);

    const debouncedFilter = useCallback(
      debounceCall((filterValue) => {
        devTools.update(INDEX_KEY, { filter: filterValue });
      }, 300),
      [],
    );

    // Process socket lists once
    useEffect(() => {
      const uniqueSocketList = websocketList.filter(
        (ws, i, arr) =>
          arr.findIndex((it) => it.channelName === ws.channelName) === i,
      );
      socketListRef.current = uniqueSocketList;
    }, [websocketList.length]);

    // Initial data processing - do this only once when data changes
    useEffect(() => {
      setIsLoading(true);

      // Heaviest operation here, will create a final merged network list
      const processData = async () => {
        const processedSockets = socketListRef.current.map((ws: any) => ({
          ...ws,
          type: 'websocket',
          method: 'ws',
          url: ws.channelName,
          name: ws.channelName,
          status: '101',
          duration: 0,
          transferredBodySize: 0,
        }));

        const mergedList: Timed[] = mergeListsWithZoom(
          resourceList as Timed[],
          fetchList,
          processedSockets as Timed[],
          { enabled: Boolean(zoomEnabled), start: zoomStartTs ?? 0, end: zoomEndTs ?? 0 }
        )

        originalListRef.current = mergedList;
        setTotalItems(mergedList.length);

        calculateResourceStats(resourceList);

        // Only display initial chunk
        setDisplayedItems(mergedList.slice(0, INITIAL_LOAD_SIZE));
        setIsLoading(false);
      };

      void processData();
    }, [
      resourceList.length,
      fetchList.length,
      socketListRef.current.length,
      zoomEnabled,
      zoomStartTs,
      zoomEndTs,
    ]);

    const calculateResourceStats = (resourceList: Record<string, any>) => {
      setTimeout(() => {
        let resourcesSize = 0
        let transferredSize = 0
        resourceList.forEach(({ decodedBodySize, headerSize, encodedBodySize }: any) => {
          resourcesSize += decodedBodySize || 0
          transferredSize += (headerSize || 0) + (encodedBodySize || 0)
        })

        setSummaryStats({
          resourcesSize,
          transferredSize,
        });
      }, 0);
    }

    useEffect(() => {
      if (originalListRef.current.length === 0) return;
      setIsProcessing(true);
      const applyFilters = async () => {
        let filteredItems: any[] = originalListRef.current;

        filteredItems = await processInChunks(filteredItems, (chunk) =>
          chunk.filter(
            (it) => {
              let valid = true;
              if (showOnlyErrors) {
                valid = parseInt(it.status) >= 400 || !it.success || it.error
              }
              if (filter) {
                try {
                  const regex = new RegExp(filter, 'i');
                  valid = valid && regex.test(it.status) || regex.test(it.name) || regex.test(it.type) || regex.test(it.method);
                } catch (e) {
                  valid = valid && String(it.status).includes(filter) || it.name.includes(filter) || it.type.includes(filter) || (it.method && it.method.includes(filter));
                }
              }
              if (activeTab !== ALL) {
                valid = valid && TYPE_TO_TAB[it.type] === activeTab;
              }

              return valid;
            },
          ),
        );

        // Update displayed items
        setDisplayedItems(filteredItems.slice(0, INITIAL_LOAD_SIZE));
        setTotalItems(filteredItems.length);
        setIsProcessing(false);
      };

      void applyFilters();
    }, [filter, activeTab, showOnlyErrors]);

    const loadMoreItems = useCallback(() => {
      if (isProcessing) return;

      setIsProcessing(true);
      setTimeout(() => {
        setDisplayedItems((prevItems) => {
          const currentLength = prevItems.length;
          const newItems = originalListRef.current.slice(
            currentLength,
            currentLength + BATCH_SIZE,
          );
          return [...prevItems, ...newItems];
        });
        setIsProcessing(false);
      }, 10);
    }, [isProcessing]);

    const hasMoreItems = displayedItems.length < totalItems;
    const loadingRef = useInfiniteScroll(loadMoreItems, hasMoreItems);

    const onTabClick = (activeTab) => {
      devTools.update(INDEX_KEY, { activeTab });
    };

    const onFilterChange = ({ target: { value } }) => {
      setInputFilterValue(value)
      debouncedFilter(value);
    };

    const [timeoutStartAutoscroll, stopAutoscroll] = useAutoscroll(
      displayedItems,
      getLastItemTime(fetchListNow, resourceListNow),
      activeIndex,
      (index) => devTools.update(INDEX_KEY, { index }),
    );
    const onMouseEnter = () => stopAutoscroll;
    const onMouseLeave = () => {
      if (isDetailsModalActive) {
        return;
      }
      timeoutStartAutoscroll();
    };

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
          (ws) => ws.channelName === item.channelName,
        );

        return setSelectedWsChannel(socketMsgList);
      }
      setIsDetailsModalActive(true);
      showModal(
        <FetchDetailsModal
          isSpot={isSpot}
          time={item.time + startedAt}
          resource={item}
          rows={displayedItems}
          fetchPresented={fetchList.length > 0}
        />,
        {
          right: true,
          width: 500,
          onClose: () => {
            setIsDetailsModalActive(false);
            timeoutStartAutoscroll();
          },
        },
      );
    };

    const tableCols = useMemo(() => {
      const cols = [
        {
          label: t('Status'),
          dataKey: 'status',
          width: 90,
          render: renderStatus,
        },
        {
          label: t('Type'),
          dataKey: 'type',
          width: 90,
          render: renderType,
        },
        {
          label: t('Method'),
          width: 80,
          dataKey: 'method',
        },
        {
          label: t('Name'),
          width: 240,
          dataKey: 'name',
          render: renderName,
        },
        {
          label: t('Size'),
          width: 80,
          dataKey: 'decodedBodySize',
          render: renderSize,
          hidden: activeTab === XHR,
        },
        {
          label: t('Duration'),
          width: 80,
          dataKey: 'duration',
          render: renderDuration,
        },
      ];
      if (!showSingleTab && !isSpot) {
        cols.unshift({
          label: t('Source'),
          width: 64,
          render: (r: Record<string, any>) => (
            <Tooltip
              title={`${getTabName?.(r.tabId) ?? `Tab ${getTabNum?.(r.tabId) ?? 0}`}`}
              placement="left"
            >
              <div className="bg-gray-light rounded-full min-w-5 min-h-5 w-5 h-5 flex items-center justify-center text-xs cursor-default">
                {getTabNum?.(r.tabId) ?? 0}
              </div>
            </Tooltip>
          ),
        });
      }
      return cols;
    }, [showSingleTab, activeTab, t, getTabName, getTabNum, isSpot]);

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
              {t('Network')}
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
          <div className="flex items-center gap-2">
            {!isMobile && !isSpot ? <TabSelector /> : null}
            <Input
              className="rounded-lg"
              placeholder="Filter by name, type, method or value"
              name="filter"
              onChange={onFilterChange}
              width={280}
              value={inputFilterValue}
              size="small"
              prefix={<SearchOutlined className="text-neutral-400" />}
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <div className="flex items-center justify-between px-4 border-b bg-teal/5 h-8">
            <div className="flex items-center">
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

              {isProcessing && (
                <span className="text-xs text-gray-500 ml-4">
                  Processing data...
                </span>
              )}
            </div>
            <InfoLine>
              <InfoLine.Point label={`${totalItems}`} value="requests" />
              <InfoLine.Point
                label={`${displayedItems.length}/${totalItems}`}
                value="displayed"
                display={displayedItems.length < totalItems}
              />
              <InfoLine.Point
                label={formatBytes(summaryStats.transferredSize)}
                value="transferred"
                display={summaryStats.transferredSize > 0}
              />
              <InfoLine.Point
                label={formatBytes(summaryStats.resourcesSize)}
                value="resources"
                display={summaryStats.resourcesSize > 0}
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

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                <p>Processing initial network data...</p>
              </div>
            </div>
          ) : (
            <NoContent
              title={
                <div className="capitalize flex items-center gap-2">
                  <InfoCircleOutlined size={18} />
                  {t('No Data')}
                </div>
              }
              size="small"
              show={displayedItems.length === 0}
            >
              <div>
                <TimeTable
                  rows={displayedItems}
                  tableHeight={panelHeight - 102 - (hasMoreItems ? 30 : 0)}
                  referenceLines={referenceLines}
                  renderPopup
                  onRowClick={showDetailsModal}
                  sortBy="time"
                  sortAscending
                  onJump={(row) => {
                    devTools.update(INDEX_KEY, {
                      index: displayedItems.indexOf(row),
                    });
                    player.jump(row.time);
                  }}
                  activeIndex={activeIndex}
                >
                  {tableCols}
                </TimeTable>

                {hasMoreItems && (
                  <div
                    ref={loadingRef}
                    className="flex justify-center items-center text-xs text-gray-500"
                  >
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                        Loading more data ({totalItems - displayedItems.length}{' '}
                        remaining)
                      </div>
                  </div>
                )}
              </div>

              {selectedWsChannel ? (
                <WSPanel
                  socketMsgList={selectedWsChannel}
                  onClose={() => setSelectedWsChannel(null)}
                />
              ) : null}
            </NoContent>
          )}
        </BottomBlock.Content>
      </BottomBlock>
    );
  },
);

const WebNetworkPanel = observer(NetworkPanelCont);
const MobileNetworkPanel = observer(MobileNetworkPanelCont);

export { WebNetworkPanel, MobileNetworkPanel };
