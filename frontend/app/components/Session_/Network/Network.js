import React from 'react';
import cn from 'classnames';
import { connectPlayer, jump, pause } from 'Player';
import { Popup, Button, TextEllipsis } from 'UI';
import { getRE } from 'App/utils';
import { TYPES } from 'Types/session/resource';
import stl from './network.module.css';
import NetworkContent from './NetworkContent';
import { connect } from 'react-redux';
import { setTimelinePointer } from 'Duck/sessions';

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

export function renderName(r) {
  return (
    <div className="flex justify-between items-center grow-0 w-full">
      <Popup
        style={{ maxWidth: '75%' }}
        content={<div className={stl.popupNameContent}>{r.url}</div>}
      >
        <TextEllipsis>{r.name}</TextEllipsis>
      </Popup>
    </div>
  );
}

export function renderDuration(r) {
  if (!r.success) return 'x';

  const text = `${Math.round(r.duration)}ms`;
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
    <Popup content={tooltipText}>
      <div className={cn(className, stl.duration)}> {text} </div>
    </Popup>
  );
}

@connectPlayer((state) => ({
  location: state.location,
  resources: state.resourceList,
  domContentLoadedTime: state.domContentLoadedTime,
  loadTime: state.loadTime,
  // time: state.time,
  playing: state.playing,
  domBuildingTime: state.domBuildingTime,
  fetchPresented: state.fetchList.length > 0,
  listNow: state.resourceListNow,
}))
@connect(
  (state) => ({
    timelinePointer: state.getIn(['sessions', 'timelinePointer']),
  }),
  { setTimelinePointer }
)
export default class Network extends React.PureComponent {
  state = {
    filter: '',
    filteredList: this.props.resources,
    activeTab: ALL,
    currentIndex: 0,
  };

  onRowClick = (e, index) => {
    // no action for direct click on network requests (so far), there is a jump button, and we don't have more information for than is already displayed in the table
  };

  onTabClick = (activeTab) => this.setState({ activeTab });

  onFilterChange = (e, { value }) => {
    const { resources } = this.props;
    const filterRE = getRE(value, 'i');
    const filtered = resources.filter(
      ({ type, name }) =>
        filterRE.test(name) && (activeTab === ALL || type === TAB_TO_TYPE_MAP[activeTab])
    );

    this.setState({ filter: value, filteredList: value ? filtered : resources, currentIndex: 0 });
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    const { filteredList } = prevState;
    if (nextProps.timelinePointer) {
      const activeItem = filteredList.find((r) => r.time >= nextProps.timelinePointer.time);
      return {
        currentIndex: activeItem ? filteredList.indexOf(activeItem) : filteredList.length - 1,
      };
    }
  }

  render() {
    const { location, domContentLoadedTime, loadTime, domBuildingTime, fetchPresented, listNow } =
      this.props;
    const { filteredList } = this.state;
    const resourcesSize = filteredList.reduce(
      (sum, { decodedBodySize }) => sum + (decodedBodySize || 0),
      0
    );
    const transferredSize = filteredList.reduce(
      (sum, { headerSize, encodedBodySize }) => sum + (headerSize || 0) + (encodedBodySize || 0),
      0
    );

    return (
      <React.Fragment>
        <NetworkContent
          // time = { time }
          location={location}
          resources={filteredList}
          domContentLoadedTime={domContentLoadedTime}
          loadTime={loadTime}
          domBuildingTime={domBuildingTime}
          fetchPresented={fetchPresented}
          resourcesSize={resourcesSize}
          transferredSize={transferredSize}
          onRowClick={this.onRowClick}
          currentIndex={listNow.length - 1}
        />
      </React.Fragment>
    );
  }
}
