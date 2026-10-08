import { Icon } from '@/ui/icons/Icon';
import { Tooltip } from '@/ui/overlays/tooltip';
import { IResourceRequest, ResourceType, Timed } from 'Player';
import MobilePlayer from 'Player/mobile/IOSPlayer';
import WebPlayer from 'Player/web/WebPlayer';
import { WsChannel } from 'Player/web/messages';
import { observer } from 'mobx-react-lite';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { formatMs } from 'App/date';
import i18n from 'App/i18n';
import { useStore } from 'App/mstore';
import { debounceCall, formatBytes } from 'App/utils';

import FetchDetailsModal from 'Shared/FetchDetailsModal';

import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import ExplainButton from '../ExplainButton';
import {
  Keyword,
  NoData,
  PanelMenu,
  PanelTabs,
  useMultiTab,
} from '../PanelKit';
import TabSelector from '../TabSelector';
import TimeTable from '../TimeTable';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import WSPanel from './WSPanel';
import check from './hasExplainAi';
import { mergeListsWithZoom, processInChunks } from './utils';

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
  [ResourceType.IOS]: XHR,
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
const TAB_LABEL: Record<string, string> = {
  [ALL]: 'All',
  [XHR]: 'Fetch/XHR',
  [JS]: 'JS',
  [CSS]: 'CSS',
  [IMG]: 'Img',
  [MEDIA]: 'Media',
  [OTHER]: 'Other',
  [WS]: 'WebSocket',
  [GRAPHQL]: 'GraphQL',
};

const DOM_LOADED_TIME_COLOR = 'bg-content-accent';
const LOAD_TIME_COLOR = 'bg-content-danger';

const BATCH_SIZE = 2500;
const INITIAL_LOAD_SIZE = 5000;

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

export function renderType(r: any) {
  return (
    <Tooltip title={<div>{r.type}</div>}>
      <div>{r.type}</div>
    </Tooltip>
  );
}

export function renderName(r: any) {
  const maxTtipUrlLength = 800;
  const tooltipUrl =
    r.url && r.url.length > maxTtipUrlLength
      ? `${r.url.slice(0, maxTtipUrlLength / 2)}......${r.url.slice(-maxTtipUrlLength / 2)}`
      : r.url;

  return (
    <Tooltip title={<div>{tooltipUrl}</div>}>
      <div
        style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {r.name}
      </div>
    </Tooltip>
  );
}

function renderSize(r: any) {
  const t = i18n.t;
  const notCaptured = t('Not captured');
  const resSizeStr = t('Resource size');
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
    <Tooltip title={content}>
      <div>{triggerText}</div>
    </Tooltip>
  );
}

export function renderDuration(r: any) {
  return <DurationCell r={r} />;
}

function DurationCell({ r }: { r: any }) {
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
    <Tooltip title={tooltipText}>
      <div> {text} </div>
    </Tooltip>
  );
}

export function TabTag({
  tabName,
  tabNum,
}: {
  tabName?: string;
  tabNum?: number;
}) {
  return (
    <Tooltip title={`${tabName ?? `Tab ${tabNum ?? 0}`}`} side="left">
      <span className="m-dt__tabtag m-mono">{tabNum ?? 0}</span>
    </Tooltip>
  );
}

function renderStatus(r: { status: string; cached: boolean; error?: string }) {
  return <StatusCell status={r.status} cached={r.cached} error={r.error} />;
}

function StatusCell({
  status,
  cached,
  error,
}: {
  status: string;
  cached: boolean;
  error?: string;
}) {
  const { t } = useTranslation();
  const noInfoReq = status === 'no-info';
  const hasTooltip = cached || noInfoReq;
  let tooltipTitle = undefined;
  let icon = null;
  if (hasTooltip) {
    if (noInfoReq) {
      tooltipTitle = t(
        'No timing information reported about this request by the browser.',
      );
      icon = <Icon name="info-circle" size={16} />;
    } else if (cached) {
      tooltipTitle = t('Served from cache');
      icon = <Icon name="wifi" size={16} />;
    }
  }
  if (error) {
    tooltipTitle = error;
    icon = null;
  }
  return (
    <Tooltip title={tooltipTitle} side="top">
      <div
        className="flex items-center gap-1 overflow-hidden text-ellipsis"
        style={{ width: 90 }}
      >
        <span className="mr-1">{status}</span>
        {icon}
      </div>
    </Tooltip>
  );
}

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
  isLive?: boolean;
  sessionId?: string;
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
    sessionId,
    isLive,
  }: Props) => {
    const usedFetchList = isLive ? fetchListNow : fetchList;
    const usedResourceList = isLive ? resourceListNow : resourceList;
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

    const originalListRef = useRef<IResourceRequest[]>([]);
    const socketListRef = useRef<any[]>([]);

    const {
      sessionStore: { devTools },
      uiPlayerStore,
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
          usedResourceList as Timed[],
          usedFetchList,
          processedSockets as Timed[],
          {
            enabled: Boolean(zoomEnabled),
            start: zoomStartTs ?? 0,
            end: zoomEndTs ?? 0,
          },
        );

        originalListRef.current = mergedList;
        setTotalItems(mergedList.length);

        calculateResourceStats(usedResourceList);

        // Only display initial chunk
        setDisplayedItems(mergedList.slice(0, INITIAL_LOAD_SIZE));
        setIsLoading(false);
      };

      void processData();
    }, [
      usedResourceList.length,
      usedFetchList.length,
      socketListRef.current.length,
      zoomEnabled,
      zoomStartTs,
      zoomEndTs,
    ]);

    const calculateResourceStats = (resourceList: Record<string, any>) => {
      setTimeout(() => {
        let resourcesSize = 0;
        let transferredSize = 0;
        resourceList.forEach(
          ({ decodedBodySize, headerSize, encodedBodySize }: any) => {
            resourcesSize += decodedBodySize || 0;
            transferredSize += (headerSize || 0) + (encodedBodySize || 0);
          },
        );

        setSummaryStats({
          resourcesSize,
          transferredSize,
        });
      }, 0);
    };

    useEffect(() => {
      if (originalListRef.current.length === 0) return;
      setIsProcessing(true);
      const applyFilters = async () => {
        let filteredItems: any[] = originalListRef.current;

        filteredItems = await processInChunks(filteredItems, (chunk) =>
          chunk.filter((it) => {
            if (showOnlyErrors) {
              const validStatus =
                parseInt(it.status) >= 400 || !it.success || it.error;
              if (!validStatus) return false;
            }

            if (filter) {
              let validQuery = true;
              try {
                const regex = new RegExp(filter, 'i');
                validQuery =
                  regex.test(it.status) ||
                  regex.test(it.name) ||
                  regex.test(it.type) ||
                  regex.test(it.method);
              } catch (e) {
                validQuery =
                  String(it.status).includes(filter) ||
                  it.name.includes(filter) ||
                  it.type.includes(filter) ||
                  (it.method && it.method.includes(filter));
              }
              if (!validQuery) return false;
            }

            if (activeTab !== ALL) {
              const validTab = TYPE_TO_TAB[it.type] === activeTab;
              if (!validTab) return false;
            }

            return true;
          }),
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

    const onFilterChange = (value: string) => {
      setInputFilterValue(value);
      debouncedFilter(value);
    };
    const multiTab = useMultiTab();
    const tabCounts = useMemo(() => {
      const c: Record<string, number> = {};
      const add = (r: any) => {
        const k = TYPE_TO_TAB[r.type as keyof typeof TYPE_TO_TAB] ?? OTHER;
        c[k] = (c[k] ?? 0) + 1;
      };
      usedFetchList.forEach(add);
      usedResourceList.forEach(add);
      if (websocketList?.length) c[WS] = websocketList.length;
      return c;
    }, [usedFetchList.length, usedResourceList.length, websocketList?.length]);
    const tabItems = [
      {
        key: ALL,
        label: t('All'),
        count: Object.values(tabCounts).reduce((n, v) => n + v, 0),
      },
      ...TAP_KEYS.filter(
        (k) => k !== ALL && (tabCounts[k] || k === activeTab),
      ).map((k) => ({ key: k, label: TAB_LABEL[k], count: tabCounts[k] ?? 0 })),
    ];

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
      const onDetailsClose = () => {
        setIsDetailsModalActive(false);
        timeoutStartAutoscroll();
      };
      if (uiPlayerStore.requestSheetHosts > 0) {
        uiPlayerStore.openRequestSheet(
          displayedItems,
          (displayedItems as any[]).indexOf(item),
          {
            onIndex: (index) => devTools.update(INDEX_KEY, { index }),
            onClose: onDetailsClose,
          },
        );
        return;
      }
      showModal(
        <FetchDetailsModal
          isSpot={isSpot}
          time={item.time + startedAt}
          resource={item}
          rows={displayedItems}
          fetchPresented={usedFetchList.length > 0}
        />,
        { right: true, width: 500, onClose: onDetailsClose },
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
      if (!showSingleTab && !isSpot && multiTab) {
        cols.unshift({
          label: t('Source'),
          width: 64,
          dataKey: 'tabId',
          render: (r: Record<string, any>) => {
            const tabName = getTabName?.(r.tabId);
            const tabNum = getTabNum?.(r.tabId);
            return <TabTag r={r} tabName={tabName} tabNum={tabNum} />;
          },
        });
      }
      return cols;
    }, [showSingleTab, activeTab, t, getTabName, getTabNum, isSpot, multiTab]);

    const hasExplainAi = (reqType: string) => {
      // @ts-ignore
      return check && [ResourceType.XHR, ResourceType.FETCH].includes(reqType);
    };
    return (
      <BottomBlock onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
        <BottomBlock.Header onClose={onClose}>
          {isMobile ? (
            <span />
          ) : (
            <PanelTabs
              label={t('Request type')}
              active={activeTab}
              onSelect={onTabClick}
              items={tabItems}
            />
          )}
          <div className="m-dt__bar-right">
            {!isMobile && !isSpot ? <TabSelector /> : null}
            <Keyword
              value={inputFilterValue}
              onChange={onFilterChange}
              placeholder={t('Filter by name or type')}
            />
            <PanelMenu
              toggles={[
                {
                  key: 'bad',
                  label: t('4xx–5xx only'),
                  checked: showOnlyErrors,
                  onChange: setShowOnlyErrors,
                },
              ]}
            />
          </div>
        </BottomBlock.Header>
        <BottomBlock.Content>
          <div className="m-dt__figrow">
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
            {isProcessing && (
              <span className="m-dt__figrow-note">{t('Processing…')}</span>
            )}
          </div>

          {isLoading ? (
            <NoData title={t('Processing network data…')} />
          ) : displayedItems.length === 0 ? (
            <NoData
              hint={
                showOnlyErrors
                  ? t('No request failed in this session.')
                  : t('No request matches that.')
              }
            />
          ) : (
            <div className="flex flex-col min-h-0">
              <TimeTable
                className="flex-1"
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
                extra={(row) =>
                  hasExplainAi(row.type) ? (
                    <ExplainButton
                      sessionId={sessionId}
                      request={{
                        url: row.url,
                        status: parseInt(row.status),
                        payload: row.request,
                        response: row.response,
                      }}
                    />
                  ) : null
                }
              >
                {tableCols}
              </TimeTable>

              {hasMoreItems && (
                <div ref={loadingRef} className="m-dt__figrow-note px-5 py-2">
                  {t('Loading more ({{n}} remaining)…', {
                    n: totalItems - displayedItems.length,
                  })}
                </div>
              )}
              {selectedWsChannel ? (
                <WSPanel
                  socketMsgList={selectedWsChannel}
                  onClose={() => setSelectedWsChannel(null)}
                />
              ) : null}
            </div>
          )}
        </BottomBlock.Content>
      </BottomBlock>
    );
  },
);
