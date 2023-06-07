import React, { useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Duration } from 'luxon';

import { Tooltip, Tabs, Input, NoContent, Icon, Toggler } from 'UI';
import { ResourceType } from 'Player';
import { formatBytes } from 'App/utils';
import { formatMs } from 'App/date';
import { useModal } from 'App/components/Modal';
import FetchDetailsModal from 'Shared/FetchDetailsModal';
import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { connect } from 'react-redux'
import TimeTable from '../TimeTable';
import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import useAutoscroll, { getLastItemTime } from '../useAutoscroll';
import { useRegExListFilterMemo, useTabListFilterMemo } from '../useListFilter'
import { toJS } from 'mobx';

const INDEX_KEY = 'network';

const ALL = 'ALL';
const XHR = 'xhr';
const JS = 'js';
const CSS = 'css';
const IMG = 'img';
const MEDIA = 'media';
const OTHER = 'other';

const TYPE_TO_TAB = {
  [ResourceType.XHR]: XHR,
  [ResourceType.FETCH]: XHR,
  [ResourceType.SCRIPT]: JS,
  [ResourceType.CSS]: CSS,
  [ResourceType.IMG]: IMG,
  [ResourceType.MEDIA]: MEDIA,
  [ResourceType.OTHER]: OTHER,
}

const TAP_KEYS = [ALL, XHR, JS, CSS, IMG, MEDIA, OTHER] as const;
const TABS = TAP_KEYS.map((tab) => ({
  text: tab === 'xhr' ? 'Fetch/XHR' : tab,
  key: tab,
}));

const DOM_LOADED_TIME_COLOR = 'teal';
const LOAD_TIME_COLOR = 'red';

function compare(a: any, b: any, key: string) {
  if (a[key] > b[key]) return 1;
  if (a[key] < b[key]) return -1;
  return 0;
}

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

export function renderStart(r: any) {
  return (
    <div className="flex justify-between items-center grow-0 w-full">
      <span>{Duration.fromMillis(r.time).toFormat('mm:ss.SSS')}</span>
    </div>
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
          <li>{`${formatBytes(r.encodedBodySize + headerSize)} transfered over network`}</li>
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
  let className = 'w-full h-full flex items-center ';
  if (r.isYellow) {
    tooltipText = 'Slower than average';
    className += 'warn color-orange';
  } else {
    tooltipText = 'Much slower than average';
    className += 'error color-red';
  }

  return (
    <Tooltip style={{ width: '100%' }} title={tooltipText}>
      <div> {text} </div>
    </Tooltip>
  );
}

function renderStatus({ status, cached }: { status: string, cached: boolean }) {
  return (
    <>
      {cached ? (
        <Tooltip title={"Served from cache"}>
          <div className="flex items-center">
            <span className="mr-1">{status}</span>
            <Icon name="wifi" size={16} />
          </div>
        </Tooltip>
      ) : status}
    </>
  )
}

function NetworkPanel({ startedAt }: { startedAt: number }) {
  const { player, store } = React.useContext(PlayerContext)

  const {
    domContentLoadedTime,
    loadTime,
    domBuildingTime,
    tabStates,
    currentTab
  } = store.get()
  const {
    fetchList = [],
    resourceList = [],
    fetchListNow = [],
    resourceListNow = []
  } = tabStates[currentTab]

  const { showModal } = useModal();
  const [sortBy, setSortBy] = useState('time');
  const [sortAscending, setSortAscending] = useState(true);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  const [isDetailsModalActive, setIsDetailsModalActive] = useState(false);
  const {
    sessionStore: { devTools },
  } = useStore();
  const filter = devTools[INDEX_KEY].filter;
  const activeTab = devTools[INDEX_KEY].activeTab;
  const activeIndex = devTools[INDEX_KEY].index;

  const list = useMemo(() =>
    // TODO: better merge (with body size info) - do it in player
    resourceList.filter(res => !fetchList.some(ft => {
      // res.url !== ft.url doesn't work on relative URLs appearing within fetchList (to-fix in player)
      if (res.name === ft.name) {
        if (res.time === ft.time) return true;
        if (res.url.includes(ft.url)) {
          return Math.abs(res.time - ft.time) < 350
            || Math.abs(res.timestamp - ft.timestamp) < 350;
        }
      }

      if (res.name !== ft.name) { return false }
      if (Math.abs(res.time - ft.time) > 250) { return false } // TODO: find good epsilons
      if (Math.abs(res.duration - ft.duration) > 200) { return false }

      return true
    }))
    .concat(fetchList)
    .sort((a, b) => a.time - b.time)
  , [ resourceList.length, fetchList.length ])

  let filteredList = useMemo(() => {
    if (!showOnlyErrors) { return list }
    return list.filter(it => parseInt(it.status) >= 400 || !it.success)
  }, [ showOnlyErrors, list ])
  filteredList = useRegExListFilterMemo(
    filteredList,
    it => [ it.status, it.name, it.type ],
    filter,
  )
  filteredList = useTabListFilterMemo(filteredList, it => TYPE_TO_TAB[it.type], ALL, activeTab)

  const onTabClick = (activeTab: typeof TAP_KEYS[number]) => devTools.update(INDEX_KEY, { activeTab })
  const onFilterChange = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => devTools.update(INDEX_KEY, { filter: value })

  // AutoScroll
  const [
    timeoutStartAutoscroll,
    stopAutoscroll,
  ] = useAutoscroll(
    filteredList,
    getLastItemTime(fetchListNow, resourceListNow),
    activeIndex,
    index => devTools.update(INDEX_KEY, { index })
  )
  const onMouseEnter = stopAutoscroll
  const onMouseLeave = () => {
    if (isDetailsModalActive) { return }
    timeoutStartAutoscroll()
  }

  const resourcesSize = useMemo(() =>
    resourceList.reduce(
      (sum, { decodedBodySize }) => sum + (decodedBodySize || 0),
      0,
    ), [ resourceList.length ])
  const transferredSize = useMemo(() =>
    resourceList.reduce(
      (sum, { headerSize, encodedBodySize }) =>
        sum + (headerSize || 0) + (encodedBodySize || 0),
      0,
    ), [ resourceList.length ])


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
  }, [ domContentLoadedTime, loadTime ])

  const showDetailsModal = (item: any) => {
    setIsDetailsModalActive(true)
    showModal(
      <FetchDetailsModal time={item.time + startedAt} resource={item} rows={filteredList} fetchPresented={fetchList.length > 0} />,
      {
        right: true,
        width: 500,
        onClose: () => {
          setIsDetailsModalActive(false)
          timeoutStartAutoscroll()
        }
      }
    )
    devTools.update(INDEX_KEY, { index: filteredList.indexOf(item) })
    stopAutoscroll()
  }

  return (
    <React.Fragment>
      <BottomBlock
        style={{ height: '300px' }}
        className="border"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <BottomBlock.Header>
          <div className="flex items-center">
            <span className="font-semibold color-gray-medium mr-4">Network</span>
            <Tabs
              className="uppercase"
              tabs={TABS}
              active={activeTab}
              onClick={onTabClick}
              border={false}
            />
          </div>
          <Input
            className="input-small"
            placeholder="Filter by name, type or value"
            icon="search"
            name="filter"
            onChange={onFilterChange}
            height={28}
            width={230}
            value={filter}
          />
        </BottomBlock.Header>
        <BottomBlock.Content>
          <div className="flex items-center justify-between px-4">
            <div>
              <Toggler
                checked={showOnlyErrors}
                name="test"
                onChange={() => setShowOnlyErrors(!showOnlyErrors)}
                label="4xx-5xx Only"
              />
            </div>
            <InfoLine>
              <InfoLine.Point label={filteredList.length + ''} value=" requests" />
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
                label={domContentLoadedTime && formatMs(domContentLoadedTime.value)}
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
              <div className="capitalize flex items-center mt-16">
                <Icon name="info-circle" className="mr-2" size="18" />
                No Data
              </div>
            }
            size="small"
            show={filteredList.length === 0}
          >
            <TimeTable
              rows={filteredList}
              referenceLines={referenceLines}
              renderPopup
              onRowClick={showDetailsModal}
              sortBy={sortBy}
              sortAscending={sortAscending}
              onJump={(row: any) => {
                devTools.update(INDEX_KEY, { index: filteredList.indexOf(row) });
                player.jump(row.time);
              }}
              activeIndex={activeIndex}
            >
              {[
                // {
                //   label: 'Start',
                //   width: 120,
                //   render: renderStart,
                // },
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
              ]}
            </TimeTable>
          </NoContent>
        </BottomBlock.Content>
      </BottomBlock>
    </React.Fragment>
  );
}

export default connect((state: any) => ({
  startedAt: state.getIn(['sessions', 'current']).startedAt,
}))(observer(NetworkPanel));
