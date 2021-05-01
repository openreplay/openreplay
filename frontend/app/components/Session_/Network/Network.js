import cn from 'classnames';
import { connectPlayer } from 'Player';
import { QuestionMarkHint, Popup, Tabs, Input } from 'UI';
import { getRE } from 'App/utils';
import { TYPES } from 'Types/session/resource';
import { formatBytes } from 'App/utils';
import { formatMs } from 'App/date';

import TimeTable from '../TimeTable';
import BottomBlock from '../BottomBlock';
import InfoLine from '../BottomBlock/InfoLine';
import stl from './network.css';
import NetworkContent from './NetworkContent';

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
const TABS = [ ALL, XHR, JS, CSS, IMG, MEDIA, OTHER ].map(tab => ({ 
  text: tab,
  key: tab,
}));

const DOM_LOADED_TIME_COLOR = "teal";
const LOAD_TIME_COLOR = "red";

export function renderName(r) { 
  return (
    <Popup
      trigger={ <div className={ stl.popupNameTrigger }>{ r.name }</div> }
      content={ <div className={ stl.popupNameContent }>{ r.url }</div> }
      size="mini"
      position="right center"
    />
  );
}

const renderXHRText = () => (
  <span className="flex items-center">
    {XHR}
    <QuestionMarkHint
      onHover
      content={ 
        <>
          Use our <a className="color-teal underline" target="_blank" href="https://docs.openreplay.com/plugins/fetch">Fetch plugin</a>
          {' to capture HTTP requests and responses, including status codes and bodies.'} <br/>
          We also provide <a className="color-teal underline" target="_blank" href="https://docs.openreplay.com/plugins/graphql">support for GraphQL</a>
          {' for easy debugging of your queries.'}
        </>
      }
      className="ml-1"
    />
  </span>
);

function renderSize(r) {
  let triggerText;
  let content;
  if (r.decodedBodySize == null) {
    triggerText = "x";
    content = "Not captured";
  } else {
    const headerSize = r.headerSize || 0;
    const encodedSize = r.encodedBodySize || 0;
    const transferred = headerSize + encodedSize;
    const showTransferred = r.headerSize != null;

    triggerText = formatBytes(r.decodedBodySize);
    content = (
      <ul>
        { showTransferred && 
          <li>{`${formatBytes( r.encodedBodySize + headerSize )} transfered over network`}</li>
        }
        <li>{`Resource size: ${formatBytes(r.decodedBodySize)} `}</li>
      </ul>
    );
  }

  return (
    <Popup
      trigger={ <div>{ triggerText }</div> }
      content={ content }
      size="mini"
      position="right center"
    />
  );
}

export function renderDuration(r) {
  if (!r.success) return 'x';

  const text = `${ r.duration }ms`;
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
  time: state.time,
  domBuildingTime: state.domBuildingTime,
  fetchPresented: state.fetchList.length > 0,
}))
export default class Network extends React.PureComponent {
  state = {
    filter: '',
    activeTab: ALL,
  }

  onTabClick = activeTab => this.setState({ activeTab })
  onFilterChange = (e, { value }) => this.setState({ filter: value })

  render() {
    const {
      location,
      resources,
      domContentLoadedTime,
      loadTime,
      domBuildingTime,
      fetchPresented,
      time
    } = this.props;
    const { filter, activeTab } = this.state;
    const filterRE = getRE(filter, 'i');
    let filtered = resources.filter(({ type, name }) =>
      filterRE.test(name) && (activeTab === ALL || type === TAB_TO_TYPE_MAP[ activeTab ]));

    const referenceLines = [];
    if (domContentLoadedTime != null) {
      referenceLines.push({
        time: domContentLoadedTime,
        color: DOM_LOADED_TIME_COLOR,
      })
    }
    if (loadTime != null) {
      referenceLines.push({
        time: loadTime,
        color: LOAD_TIME_COLOR,
      })
    }

    let tabs = TABS;
    if (!fetchPresented) {
      tabs = TABS.map(tab => tab.key === XHR 
        ? {
            text: renderXHRText(),
            key: XHR,
          } 
        : tab
      );
    }

    const resourcesSize = filtered.reduce((sum, { decodedBodySize }) => sum + (decodedBodySize || 0), 0);
    const transferredSize = filtered
      .reduce((sum, { headerSize, encodedBodySize }) => sum + (headerSize || 0) + (encodedBodySize || 0), 0);

    return (
      <React.Fragment>
        <NetworkContent
          // {...this.props }
          time = { time }
          location = { location }
          resources = { resources }
          domContentLoadedTime = { domContentLoadedTime }
          loadTime = { loadTime }
          domBuildingTime = { domBuildingTime }
          fetchPresented = { fetchPresented }
          resourcesSize={resourcesSize}
          transferredSize={transferredSize}
        />
        {/* <BottomBlock>
          <BottomBlock.Header>
            <Tabs 
              className="uppercase"
              tabs={ tabs }
              active={ activeTab }
              onClick={ this.onTabClick }
              border={ false }
            />
            <Input
              className="input-small"
              placeholder="Filter by Name"
              icon="search"
              iconPosition="left"
              name="filter"
              onChange={ this.onFilterChange }
            />
          </BottomBlock.Header>
          <BottomBlock.Content>
            <InfoLine>
              <InfoLine.Point label={ filtered.length } value=" requests" />
              <InfoLine.Point 
                label={ formatBytes(transferredSize) } 
                value="transferred"
                display={ transferredSize > 0 } 
              />
              <InfoLine.Point 
                label={ formatBytes(resourcesSize) }
                value="resources"
                display={ resourcesSize > 0 }
              />
              <InfoLine.Point 
                label="DOM Building Time"
                value={ formatMs(domBuildingTime)}
                display={ domBuildingTime != null }
              />
              <InfoLine.Point 
                label="DOMContentLoaded"
                value={ formatMs(domContentLoadedTime)}
                display={ domContentLoadedTime != null }
                dotColor={ DOM_LOADED_TIME_COLOR }
              />
              <InfoLine.Point 
                label="Load"
                value={ formatMs(loadTime)}
                display={ loadTime != null }
                dotColor={ LOAD_TIME_COLOR }
              />
            </InfoLine>
            <TimeTable
              rows={ filtered }
              referenceLines={referenceLines}
              renderPopup
              navigation
            >
              {[
                {
                  label: "Status",
                  dataKey: 'status',
                  width: 70,
                }, {
                  label: "Type",
                  dataKey: 'type',
                  width: 60,
                }, {
                  label: "Name",
                  width: 130,
                  render: renderName,
                },
                {
                  label: "Size",
                  width: 60,
                  render: renderSize,
                },
                {
                  label: "Time",
                  width: 80,
                  render: renderDuration,
                }
              ]}
            </TimeTable>
          </BottomBlock.Content>
        </BottomBlock> */}
      </React.Fragment>
    );
  }
}
