import cn from 'classnames';
import { connectPlayer, jump, pause } from 'Player';
import { QuestionMarkHint, Popup, Tabs, Input } from 'UI';
import { getRE } from 'App/utils';
import { TYPES } from 'Types/session/resource';
import stl from './network.css';
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
  [ XHR ]: TYPES.XHR,
  [ JS ]: TYPES.JS,
  [ CSS ]: TYPES.CSS,
  [ IMG ]: TYPES.IMG,
  [ MEDIA ]: TYPES.MEDIA,
  [ OTHER ]: TYPES.OTHER
}

export function renderName(r) { 
  return (
    <div className="flex w-full relative items-center">
      <Popup
        trigger={ <div className={ stl.popupNameTrigger }>{ r.name }</div> }
        content={ <div className={ stl.popupNameContent }>{ r.url }</div> }
        size="mini"
        position="right center"
      />
      <div
        className="absolute right-0 text-xs uppercase p-2 color-gray-500 hover:color-black"
        onClick={ (e) => {
          e.stopPropagation();
          jump(r.time)
        }}
      >Jump</div>
    </div>
  );
}

export function renderDuration(r) {
  if (!r.success) return 'x';

  const text = `${ Math.round(r.duration) }ms`;
  if (!r.isRed() && !r.isYellow()) return text;

  let tooltipText;
  let className = "w-full h-full flex items-center ";
  if (r.isYellow()) {
    tooltipText = "Slower than average";
    className += "warn color-orange";
  } else {
    tooltipText = "Much slower than average";
    className += "error color-red";
  }

  return (
    <Popup
      content={ tooltipText }
      inverted
      trigger={ 
        <div className={ cn(className, stl.duration) } > { text } </div>
      }
    />
  );
}

@connectPlayer(state => ({
  location: state.location,
  resources: state.resourceList,
  domContentLoadedTime: state.domContentLoadedTime,
  loadTime: state.loadTime,
  // time: state.time,
  playing: state.playing,
  domBuildingTime: state.domBuildingTime,
  fetchPresented: state.fetchList.length > 0,
}))
@connect(state => ({
  timelinePointer: state.getIn(['sessions', 'timelinePointer']),
}), { setTimelinePointer })
export default class Network extends React.PureComponent {
  state = {
    filter: '',
    filteredList: this.props.resources,
    activeTab: ALL,
    currentIndex: 0
  }

  onRowClick = (e, index) => {
    pause();
    jump(e.time);
    this.setState({ currentIndex: index })
    this.props.setTimelinePointer(null);
  }

  onTabClick = activeTab => this.setState({ activeTab })

  onFilterChange = (e, { value }) => {
    const { resources } = this.props;
    const filterRE = getRE(value, 'i');
    const filtered = resources.filter(({ type, name }) =>
      filterRE.test(name) && (activeTab === ALL || type === TAB_TO_TYPE_MAP[ activeTab ]));

    this.setState({ filter: value, filteredList: value ? filtered : resources, currentIndex: 0 });
  }

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
    const {
      location,
      resources,
      domContentLoadedTime,
      loadTime,
      domBuildingTime,
      fetchPresented,
      // time,
      playing
    } = this.props;
    const { filter, activeTab, currentIndex, filteredList } = this.state;
    // const filterRE = getRE(filter, 'i');
    // let filtered = resources.filter(({ type, name }) =>
    //   filterRE.test(name) && (activeTab === ALL || type === TAB_TO_TYPE_MAP[ activeTab ]));
    const resourcesSize = filteredList.reduce((sum, { decodedBodySize }) => sum + (decodedBodySize || 0), 0);
    const transferredSize = filteredList
      .reduce((sum, { headerSize, encodedBodySize }) => sum + (headerSize || 0) + (encodedBodySize || 0), 0);

    return (
      <React.Fragment>
        <NetworkContent
          // time = { time }
          location = { location }
          resources = { filteredList }
          domContentLoadedTime = { domContentLoadedTime }
          loadTime = { loadTime }
          domBuildingTime = { domBuildingTime }
          fetchPresented = { fetchPresented }
          resourcesSize={resourcesSize}
          transferredSize={transferredSize}
          onRowClick={ this.onRowClick }
          currentIndex={currentIndex}
        />
      </React.Fragment>
    );
  }
}
