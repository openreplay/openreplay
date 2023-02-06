import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip, Tabs, Input, NoContent, Icon, Toggler } from 'UI';
import { getRE } from 'App/utils';
import Resource, { TYPES } from 'Types/session/resource';
import { formatBytes } from 'App/utils';
import { formatMs } from 'App/date';

import TimeTable from '../TimeTable';
import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import { Duration } from 'luxon';
import { connectPlayer, jump } from 'Player';
import { useModal } from 'App/components/Modal';
import FetchDetailsModal from 'Shared/FetchDetailsModal';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';

const INDEX_KEY = 'network';

const ALL = 'ALL';
const XHR = 'xhr';
const JS = 'js';
const CSS = 'css';
const IMG = 'img';
const MEDIA = 'media';
const OTHER = 'other';

const TAB_TO_TYPE_MAP: any = {
  [XHR]: TYPES.XHR,
  [JS]: TYPES.JS,
  [CSS]: TYPES.CSS,
  [IMG]: TYPES.IMG,
  [MEDIA]: TYPES.MEDIA,
  [OTHER]: TYPES.OTHER,
};
const TABS: any = [ALL, XHR, JS, CSS, IMG, MEDIA, OTHER].map((tab) => ({
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
    const encodedSize = r.encodedBodySize || 0;
    const transferred = headerSize + encodedSize;
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
  if (!r.isRed() && !r.isYellow()) return text;

  let tooltipText;
  let className = 'w-full h-full flex items-center ';
  if (r.isYellow()) {
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

let timeOut: any = null;
const TIMEOUT_DURATION = 5000;

interface Props {
  location: any;
  resources: any;
  fetchList: any;
  domContentLoadedTime: any;
  loadTime: any;
  playing: boolean;
  domBuildingTime: any;
  time: any;
}
function NetworkPanel(props: Props) {
  const { resources, time, domContentLoadedTime, loadTime, domBuildingTime, fetchList } = props;
  const { showModal, component: modalActive } = useModal();
  const [filteredList, setFilteredList] = useState([]);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const additionalHeight = 0;
  const fetchPresented = fetchList.length > 0;
  const {
    sessionStore: { devTools },
  } = useStore();
  const filter = useObserver(() => devTools[INDEX_KEY].filter);
  const activeTab = useObserver(() => devTools[INDEX_KEY].activeTab);
  const activeIndex = useObserver(() => devTools[INDEX_KEY].index);
  const [pauseSync, setPauseSync] = useState(activeIndex > 0);
  const synRef: any = useRef({});

  const onTabClick = (activeTab: any) => devTools.update(INDEX_KEY, { activeTab });
  const onFilterChange = ({ target: { value } }: any) => {
    devTools.update(INDEX_KEY, { filter: value });
  };

  synRef.current = {
    pauseSync,
    activeIndex,
  };

  const removePause = () => {
    if (!!modalActive) return;
    clearTimeout(timeOut);
    timeOut = setTimeout(() => {
      devTools.update(INDEX_KEY, { index: getCurrentIndex() });
      setPauseSync(false);
    }, TIMEOUT_DURATION);
  };

  const onMouseLeave = () => {
    if (!!modalActive) return;
    removePause();
  };

  useEffect(() => {
    if (pauseSync) {
      removePause();
    }

    return () => {
      clearTimeout(timeOut);
      if (!synRef.current.pauseSync) {
        devTools.update(INDEX_KEY, { index: 0 });
      }
    };
  }, []);

  const getCurrentIndex = () => {
    return filteredList.filter((item: any) => item.time <= time).length - 1;
  };

  useEffect(() => {
    const currentIndex = getCurrentIndex();
    if (currentIndex !== activeIndex && !pauseSync) {
      devTools.update(INDEX_KEY, { index: currentIndex });
    }
  }, [time]);

  const { resourcesSize, transferredSize } = useMemo(() => {
    const resourcesSize = resources.reduce(
      (sum: any, { decodedBodySize }: any) => sum + (decodedBodySize || 0),
      0
    );

    const transferredSize = resources.reduce(
      (sum: any, { headerSize, encodedBodySize }: any) =>
        sum + (headerSize || 0) + (encodedBodySize || 0),
      0
    );
    return {
      resourcesSize,
      transferredSize,
    };
  }, [resources]);

  useEffect(() => {
    const filterRE = getRE(filter, 'i');
    let list = resources;

    fetchList.forEach(
      (fetchCall: any) =>
        (list = list.filter((networkCall: any) => networkCall.url !== fetchCall.url))
    );
    if (fetchPresented) {
      list = list.filter((i: any) => i.type !== TYPES.XHR)
    }
    list = list.concat(fetchList);

    list = list.filter(
      ({ type, name, status, success }: any) =>
        (!!filter ? filterRE.test(status) || filterRE.test(name) || filterRE.test(type) : true) &&
        (activeTab === ALL || type === TAB_TO_TYPE_MAP[activeTab]) &&
        (showOnlyErrors ? parseInt(status) >= 400 || !success : true)
    );
    setFilteredList(list);
  }, [resources, filter, showOnlyErrors, activeTab, fetchPresented]);

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
  }, []);

  const showDetailsModal = (row: any) => {
    clearTimeout(timeOut);
    setPauseSync(true);
    showModal(
      <FetchDetailsModal resource={row} rows={filteredList} fetchPresented={fetchPresented} />,
      {
        right: true,
        onClose: removePause,
      }
    );
    devTools.update(INDEX_KEY, { index: filteredList.indexOf(row) });
  };

  useEffect(() => {
    devTools.update(INDEX_KEY, { filter, activeTab });
  }, [filter, activeTab]);

  return (
    <React.Fragment>
      <BottomBlock
        style={{ height: 300 + additionalHeight + 'px' }}
        className="border"
        onMouseEnter={() => setPauseSync(true)}
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
            iconPosition="left"
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
              additionalHeight={additionalHeight}
              onJump={(row: any) => {
                setPauseSync(true);
                devTools.update(INDEX_KEY, { index: filteredList.indexOf(row) });
                jump(row.time);
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
                  width: 70,
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
                  label: 'Time',
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

export default connectPlayer((state: any) => ({
    location: state.location,
    resources: state.resourceList,
    domContentLoadedTime: state.domContentLoadedTime,
    fetchList: state.fetchList.map((i: any) =>
      Resource({ ...i.toJS(), type: TYPES.XHR, time: i.time < 0 ? 0 : i.time })
    ),
    loadTime: state.loadTime,
    time: state.time,
    playing: state.playing,
    domBuildingTime: state.domBuildingTime,
  }
))(NetworkPanel);
