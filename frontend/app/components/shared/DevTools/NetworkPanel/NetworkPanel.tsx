import React, { useState } from 'react';
import cn from 'classnames';
// import { connectPlayer } from 'Player';
import { QuestionMarkHint, Popup, Tabs, Input, NoContent, Icon, Toggler, Button } from 'UI';
import { getRE } from 'App/utils';
import Resource, { TYPES } from 'Types/session/resource';
import { formatBytes } from 'App/utils';
import { formatMs } from 'App/date';

import TimeTable from '../TimeTable';
import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
// import stl from './network.module.css';
import { Duration } from 'luxon';
import { connectPlayer, jump, pause } from 'Player';
import { useModal } from 'App/components/Modal';
import FetchDetailsModal from 'Shared/FetchDetailsModal';
import { sort } from 'App/duck/sessions';

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
    <Popup style={{ width: '100%' }} content={<div>{r.type}</div>}>
      <div>{r.type}</div>
    </Popup>
  );
}

export function renderName(r: any) {
  return (
    <Popup style={{ width: '100%' }} content={<div>{r.url}</div>}>
      <div>{r.name}</div>
    </Popup>
  );
}

export function renderStart(r: any) {
  return (
    <div className="flex justify-between items-center grow-0 w-full">
      <span>{Duration.fromMillis(r.time).toFormat('mm:ss.SSS')}</span>
    </div>
  );
}

const renderXHRText = () => (
  <span className="flex items-center">
    {XHR}
    <QuestionMarkHint
      onHover={true}
      content={
        <>
          Use our{' '}
          <a
            className="color-teal underline"
            target="_blank"
            href="https://docs.openreplay.com/plugins/fetch"
          >
            Fetch plugin
          </a>
          {' to capture HTTP requests and responses, including status codes and bodies.'} <br />
          We also provide{' '}
          <a
            className="color-teal underline"
            target="_blank"
            href="https://docs.openreplay.com/plugins/graphql"
          >
            support for GraphQL
          </a>
          {' for easy debugging of your queries.'}
        </>
      }
      className="ml-1"
    />
  </span>
);

function renderSize(r: any) {
  if (r.responseBodySize) return formatBytes(r.responseBodySize);
  let triggerText;
  let content;
  if (r.decodedBodySize == null) {
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
    <Popup style={{ width: '100%' }} content={content}>
      <div>{triggerText}</div>
    </Popup>
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
    <Popup style={{ width: '100%' }} content={tooltipText}>
      <div> {text} </div>
    </Popup>
  );
}

interface Props {
  location: any;
  resources: any;
  fetchList: any;
  domContentLoadedTime: any;
  loadTime: any;
  playing: boolean;
  domBuildingTime: any;
  currentIndex: any;
  time: any;
}
function NetworkPanel(props: Props) {
  const {
    resources,
    time,
    currentIndex,
    domContentLoadedTime,
    loadTime,
    playing,
    domBuildingTime,
    fetchList,
  } = props;
  const { showModal, hideModal } = useModal();
  const [activeTab, setActiveTab] = useState(ALL);
  const [sortBy, setSortBy] = useState('time');
  const [sortAscending, setSortAscending] = useState(true);
  const [filter, setFilter] = useState('');
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);
  const onTabClick = (activeTab: any) => setActiveTab(activeTab);
  const onFilterChange = ({ target: { value } }: any) => setFilter(value);
  const additionalHeight = 0;
  const fetchPresented = fetchList.length > 0;

  const resourcesSize = resources.reduce(
    (sum: any, { decodedBodySize }: any) => sum + (decodedBodySize || 0),
    0
  );

  const transferredSize = resources.reduce(
    (sum: any, { headerSize, encodedBodySize }: any) =>
      sum + (headerSize || 0) + (encodedBodySize || 0),
    0
  );

  const filterRE = getRE(filter, 'i');
  let filtered = React.useMemo(() => {
    let list = resources;
    fetchList.forEach(
      (fetchCall: any) =>
        (list = list.filter((networkCall: any) => networkCall.url !== fetchCall.url))
    );
    list = list.concat(fetchList);
    list = list.sort((a: any, b: any) => {
      return compare(a, b, sortBy);
    });

    if (!sortAscending) {
      list = list.reverse();
    }

    list = list.filter(
      ({ type, name, status, success }: any) =>
        (!!filter ? filterRE.test(status) || filterRE.test(name) || filterRE.test(type) : true) &&
        (activeTab === ALL || type === TAB_TO_TYPE_MAP[activeTab]) &&
        (showOnlyErrors ? (parseInt(status) >= 400 || !success) : true)
    );
    return list;
  }, [filter, sortBy, sortAscending, showOnlyErrors, activeTab]);

  // const lastIndex = currentIndex || filtered.filter((item: any) => item.time <= time).length - 1;
  const referenceLines = [];
  if (domContentLoadedTime != null) {
    referenceLines.push({
      time: domContentLoadedTime.time,
      color: DOM_LOADED_TIME_COLOR,
    });
  }
  if (loadTime != null) {
    referenceLines.push({
      time: loadTime.time,
      color: LOAD_TIME_COLOR,
    });
  }

  const onRowClick = (row: any) => {
    showModal(<FetchDetailsModal resource={row} fetchPresented={fetchPresented} />, {
      right: true,
    });
  };

  const handleSort = (sortKey: string) => {
    if (sortKey === sortBy) {
      setSortAscending(!sortAscending);
      // setSortBy('time');
    }
    setSortBy(sortKey);
  };

  return (
    <React.Fragment>
      <BottomBlock style={{ height: 300 + additionalHeight + 'px' }} className="border">
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
              <InfoLine.Point label={filtered.length} value=" requests" />
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
            show={filtered.length === 0}
          >
            <TimeTable
              rows={filtered}
              referenceLines={referenceLines}
              renderPopup
              onRowClick={onRowClick}
              additionalHeight={additionalHeight}
              onJump={jump}
              sortBy={sortBy}
              sortAscending={sortAscending}
              // activeIndex={lastIndex}
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
                  onClick: handleSort,
                },
                {
                  label: 'Type',
                  dataKey: 'type',
                  width: 90,
                  render: renderType,
                  onClick: handleSort,
                },
                {
                  label: 'Name',
                  width: 240,
                  dataKey: 'name',
                  render: renderName,
                  onClick: handleSort,
                },
                {
                  label: 'Size',
                  width: 80,
                  dataKey: 'decodedBodySize',
                  render: renderSize,
                  onClick: handleSort,
                },
                {
                  label: 'Time',
                  width: 80,
                  dataKey: 'duration',
                  render: renderDuration,
                  onClick: handleSort,
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
  fetchList: state.fetchList.map((i: any) => Resource({ ...i.toJS(), type: TYPES.XHR })),
  domContentLoadedTime: state.domContentLoadedTime,
  loadTime: state.loadTime,
  // time: state.time,
  playing: state.playing,
  domBuildingTime: state.domBuildingTime,
}))(NetworkPanel);
