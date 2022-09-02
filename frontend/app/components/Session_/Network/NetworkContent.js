import React from 'react';
import cn from 'classnames';
// import { connectPlayer } from 'Player';
import { QuestionMarkHint, Popup, Tabs, Input, NoContent, Icon, Button } from 'UI';
import { getRE } from 'App/utils';
import { TYPES } from 'Types/session/resource';
import { formatBytes } from 'App/utils';
import { formatMs } from 'App/date';

import TimeTable from '../TimeTable';
import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import stl from './network.module.css';
import { Duration } from 'luxon';
import { jump } from 'Player';

const ALL = 'ALL';
const XHR = 'xhr';
const JS = 'js';
const CSS = 'css';
const IMG = 'img';
const MEDIA = 'media';
const OTHER = 'other';

const TAB_TO_TYPE_MAP = {
  [XHR]: TYPES.XHR,
  [JS]: TYPES.JS,
  [CSS]: TYPES.CSS,
  [IMG]: TYPES.IMG,
  [MEDIA]: TYPES.MEDIA,
  [OTHER]: TYPES.OTHER,
};
const TABS = [ALL, XHR, JS, CSS, IMG, MEDIA, OTHER].map((tab) => ({
  text: tab,
  key: tab,
}));

const DOM_LOADED_TIME_COLOR = 'teal';
const LOAD_TIME_COLOR = 'red';

export function renderType(r) {
  return (
    <Popup style={{ width: '100%' }} content={<div className={stl.popupNameContent}>{r.type}</div>}>
      <div className={stl.popupNameTrigger}>{r.type}</div>
    </Popup>
  );
}

export function renderName(r) {
  return (
      <Popup
        style={{ width: '100%' }}
        content={<div className={stl.popupNameContent}>{r.url}</div>}
      >
        <div className={stl.popupNameTrigger}>{r.name}</div>
      </Popup>
  );
}

export function renderStart(r) {
  return (
    <div className="flex justify-between items-center grow-0 w-full">
      <span>
        {Duration.fromMillis(r.time).toFormat('mm:ss.SSS')}
      </span>
      <Button
        variant="text"
        className="right-0 text-xs uppercase p-2 color-gray-500 hover:color-teal"
        onClick={(e) => {
          e.stopPropagation();
          jump(r.time);
        }}
      >
        Jump
    </Button>
  </div>
  )
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

function renderSize(r) {
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

export function renderDuration(r) {
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
      <div className={cn(className, stl.duration)}> {text} </div>
    </Popup>
  );
}

export default class NetworkContent extends React.PureComponent {
  state = {
    filter: '',
    activeTab: ALL,
  };

  onTabClick = (activeTab) => this.setState({ activeTab });
  onFilterChange = ({ target: { value } }) => this.setState({ filter: value });

  render() {
    const {
      location,
      resources,
      domContentLoadedTime,
      loadTime,
      domBuildingTime,
      fetchPresented,
      onRowClick,
      isResult = false,
      additionalHeight = 0,
      resourcesSize,
      transferredSize,
      time,
      currentIndex,
    } = this.props;
    const { filter, activeTab } = this.state;
    const filterRE = getRE(filter, 'i');
    let filtered = resources.filter(
      ({ type, name }) =>
        filterRE.test(name) && (activeTab === ALL || type === TAB_TO_TYPE_MAP[activeTab])
    );
    const lastIndex = currentIndex || filtered.filter((item) => item.time <= time).length - 1;

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

    let tabs = TABS;
    if (!fetchPresented) {
      tabs = TABS.map((tab) =>
        !isResult && tab.key === XHR
          ? {
              text: renderXHRText(),
              key: XHR,
            }
          : tab
      );
    }

    return (
      <React.Fragment>
        <BottomBlock style={{ height: 300 + additionalHeight + 'px' }} className="border">
          <BottomBlock.Header showClose={!isResult}>
            <div className="flex items-center">
              <span className="font-semibold color-gray-medium mr-4">Network</span>
              <Tabs
                className="uppercase"
                tabs={tabs}
                active={activeTab}
                onClick={this.onTabClick}
                border={false}
              />
            </div>
            <Input
              className="input-small"
              placeholder="Filter by name"
              icon="search"
              iconPosition="left"
              name="filter"
              onChange={this.onFilterChange}
            />
          </BottomBlock.Header>
          <BottomBlock.Content>
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
                // navigation
                onRowClick={onRowClick}
                additionalHeight={additionalHeight}
                activeIndex={lastIndex}
              >
                {[
                  {
                    label: 'Start',
                    width: 120,
                    render: renderStart,
                  },
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
                    render: renderName,
                  },
                  {
                    label: 'Size',
                    width: 60,
                    render: renderSize,
                  },
                  {
                    label: 'Time',
                    width: 80,
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
}
