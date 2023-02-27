import React from 'react';
import copy from 'copy-to-clipboard';
import cn from 'classnames';
import { Icon, TextEllipsis } from 'UI';
import { TYPES } from 'Types/session/event';
import { prorata } from 'App/utils';
import withOverlay from 'Components/hocs/withOverlay';
import LoadInfo from './LoadInfo';
import cls from './event.module.css';
import { numberWithCommas } from 'App/utils';

@withOverlay()
export default class Event extends React.PureComponent {
  state = {
    menuOpen: false,
  }

  componentDidMount() {
    this.wrapper.addEventListener('contextmenu', this.onContextMenu);
  }

  onContextMenu = (e) => {
    e.preventDefault();
    this.setState({ menuOpen: true });
  }
  onMouseLeave = () => this.setState({ menuOpen: false })

  copyHandler = (e) => {
    e.stopPropagation();
    //const ctrlOrCommandPressed = e.ctrlKey || e.metaKey;
    //if (ctrlOrCommandPressed && e.keyCode === 67) {
    const { event } = this.props;
    copy(event.getIn([ 'target', 'path' ]) || event.url || '');
    this.setState({ menuOpen: false });
  }

  toggleInfo = (e) => {
    e.stopPropagation();
    this.props.toggleInfo();
  }

  // eslint-disable-next-line complexity
  renderBody = () => {
    const { event } = this.props;
    let title = event.type;
    let body;
    switch (event.type) {
      case TYPES.LOCATION:
        title = 'Visited';
        body = event.url;
        break;
      case TYPES.CLICK:
        title = 'Clicked';
        body = event.label;
        break;
      case TYPES.INPUT:
        title = 'Input';
        body = event.value;
        break;
      case TYPES.CLICKRAGE:
        title = `${ event.count } Clicks`;
        body = event.label;
        break;
      case TYPES.IOS_VIEW:
        title = 'View';
        body = event.name;
        break;
    }
    const isLocation = event.type === TYPES.LOCATION;
    const isClickrage = event.type === TYPES.CLICKRAGE;

    return (
      <div className={ cn(cls.main, 'flex flex-col w-full') } >
        <div className="flex items-center w-full">
          { event.type && <Icon name={`event/${event.type.toLowerCase()}`} size="16" color={isClickrage? 'red' : 'gray-dark' } /> }
          <div className="ml-3 w-full">
            <div className="flex w-full items-first justify-between">
              <div className="flex items-center w-full" style={{ minWidth: '0'}}>
                <span className={cls.title}>{ title }</span>
                {/* { body && !isLocation && <div className={ cls.data }>{ body }</div> } */}
                { body && !isLocation &&
                  <TextEllipsis maxWidth="60%" className="w-full ml-2 text-sm color-gray-medium" text={body} />
                }
              </div>
              { isLocation && event.speedIndex != null &&
                <div className="color-gray-medium flex font-medium items-center leading-none justify-end">
                  <div className="font-size-10 pr-2">{"Speed Index"}</div>
                  <div>{ numberWithCommas(event.speedIndex || 0) }</div>
                </div>
              }
            </div>
            { event.target && event.target.label &&
              <div className={ cls.badge } >{ event.target.label }</div>
            }
          </div>
        </div>
        { isLocation &&
          <div className="mt-1">
              <span className="text-sm font-normal color-gray-medium">{ body }</span>
          </div>
        }
      </div>
    );
  };

  render() {
    const {
      event,
      selected,
      isCurrent,
      onClick,
      showSelection,
      onCheckboxClick,
      showLoadInfo,
      toggleLoadInfo,
      isRed,
      extended,
      highlight = false,
      presentInSearch = false,
      isLastInGroup,
      whiteBg,
    } = this.props;
    const { menuOpen } = this.state;
    return (
      <div
        ref={ ref => { this.wrapper = ref } }
        onMouseLeave={ this.onMouseLeave }
        data-openreplay-label="Event"
        data-type={event.type}
        className={ cn(cls.event, {
          [ cls.menuClosed ]: !menuOpen,
          [ cls.highlighted ]: showSelection ? selected : isCurrent,
          [ cls.selected ]: selected,
          [ cls.showSelection ]: showSelection,
          [ cls.red ]: isRed,
          [ cls.clickType ]: event.type === TYPES.CLICK,
          [ cls.inputType ]: event.type === TYPES.INPUT,
          [ cls.clickrageType ]: event.type === TYPES.CLICKRAGE,
          [ cls.highlight ] : presentInSearch,
          [ cls.lastInGroup ]: whiteBg,
        }) }
        onClick={ onClick }
      >
        { menuOpen &&
          <button onClick={ this.copyHandler } className={ cls.contextMenu }>
            { event.target ? 'Copy CSS' : 'Copy URL' }
          </button>
        }
        <div className={ cls.topBlock }>
          <div className={ cls.firstLine }>
            { this.renderBody() }
          </div>
          {/* { event.type === TYPES.LOCATION &&
          <div className="text-sm font-normal color-gray-medium">{event.url}</div>
          } */}
        </div>
        { event.type === TYPES.LOCATION && (event.fcpTime || event.visuallyComplete || event.timeToInteractive) &&
          <LoadInfo
            showInfo={ showLoadInfo }
            onClick={ toggleLoadInfo }
            event={ event }
            prorata={ prorata({
              parts: 100,
              elements: { a: event.fcpTime, b: event.visuallyComplete, c: event.timeToInteractive },
              startDivisorFn: elements => elements / 1.2,
              // eslint-disable-next-line no-mixed-operators
              divisorFn: (elements, parts) => elements / (2 * parts + 1),
            }) }
          />
        }
      </div>
    );
  }
}
