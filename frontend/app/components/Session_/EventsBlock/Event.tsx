import React, { useRef, useState } from 'react';
import copy from 'copy-to-clipboard';
import cn from 'classnames';
import { Icon, TextEllipsis, Tooltip } from 'UI';
import { TYPES } from 'Types/session/event';
import { prorata } from 'App/utils';
import withOverlay from 'Components/hocs/withOverlay';
import LoadInfo from './LoadInfo';
import cls from './event.module.css';
import { numberWithCommas } from 'App/utils';

type Props = {
  event: any;
  selected?: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
  showSelection?: boolean;
  showLoadInfo?: boolean;
  toggleLoadInfo?: () => void;
  isRed?: boolean;
  presentInSearch?: boolean;
  whiteBg?: boolean;
};

const isFrustrationEvent = (evt: any): boolean => {
  if (evt.type === 'mouse_thrashing' || evt.type === TYPES.CLICKRAGE || evt.type === TYPES.TAPRAGE) {
    return true;
  }
  if (evt.type === TYPES.CLICK || evt.type === TYPES.INPUT) {
    return evt.hesitation > 1000;
  }
  return false;
};

const Event: React.FC<Props> = ({
                                  event,
                                  selected = false,
                                  isCurrent = false,
                                  onClick,
                                  showSelection = false,
                                  showLoadInfo,
                                  toggleLoadInfo,
                                  isRed = false,
                                  presentInSearch = false,
                                  whiteBg
                                }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLocation = event.type === TYPES.LOCATION;

  const onContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setMenuOpen(true);
  };

  const onMouseLeave = () => setMenuOpen(false);

  const copyHandler = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const path = event.getIn(['target', 'path']) || event.url || '';
    copy(path);
    setMenuOpen(false);
  };

  const renderBody = () => {
    let title = event.type;
    let body;
    let icon;
    const isFrustration = isFrustrationEvent(event);
    const tooltip = { disabled: true, text: '' };

    switch (event.type) {
      case TYPES.LOCATION:
        title = 'Visited';
        body = event.url;
        icon = 'event/location';
        break;
      case TYPES.SWIPE:
        title = 'Swipe';
        body = event.direction;
        icon = `chevron-${event.direction}`
        break;
      case TYPES.TOUCH:
        title = 'Tapped';
        body = event.label;
        icon = 'event/click';
        break;
      case TYPES.CLICK:
        title = 'Clicked';
        body = event.label;
        icon = isFrustration ? 'event/click_hesitation' : 'event/click';
        isFrustration
          ? Object.assign(tooltip, {
            disabled: false,
            text: `User hesitated ${Math.round(event.hesitation / 1000)}s to perform this event`
          })
          : null;
        break;
      case TYPES.INPUT:
        title = 'Input';
        body = event.value;
        icon = isFrustration ? 'event/input_hesitation' : 'event/input';
        isFrustration
          ? Object.assign(tooltip, {
            disabled: false,
            text: `User hesitated ${Math.round(event.hesitation / 1000)}s to enter a value in this input field.`
          })
          : null;
        break;
      case TYPES.CLICKRAGE:
      case TYPES.TAPRAGE:
        title = event.count ? `${event.count} Clicks` : 'Click Rage';
        body = event.label;
        icon = 'event/clickrage';
        break;
      case TYPES.IOS_VIEW:
        title = 'View';
        body = event.name;
        icon = 'event/ios_view';
        break;
      case 'mouse_thrashing':
        title = 'Mouse Thrashing';
        icon = 'event/mouse_thrashing';
        break;
    }

    return (
      <Tooltip
        title={tooltip.text}
        disabled={tooltip.disabled}
        placement={'left'}
        anchorClassName={'w-full'}
        containerClassName={'w-full'}
      >
        <div className={cn(cls.main, 'flex flex-col w-full')}>
          <div className={cn('flex items-center w-full', { 'px-4': isLocation })}>
            {event.type && <Icon name={icon} size='16' color={'gray-dark'} />}
            <div className='ml-3 w-full'>
              <div className='flex w-full items-first justify-between'>
                <div className='flex items-center w-full' style={{ minWidth: '0' }}>
                  <span className={cn(cls.title, { 'font-medium': isLocation })}>{title}</span>
                  {body && !isLocation && (
                    <TextEllipsis
                      maxWidth='60%'
                      className='w-full ml-2 text-sm color-gray-medium'
                      text={body}
                    />
                  )}
                </div>
                {isLocation && event.speedIndex != null && (
                  <div className='color-gray-medium flex font-medium items-center leading-none justify-end'>
                    <div className='font-size-10 pr-2'>{'Speed Index'}</div>
                    <div>{numberWithCommas(event.speedIndex || 0)}</div>
                  </div>
                )}
              </div>
              {event.target && event.target.label && (
                <div className={cls.badge}>{event.target.label}</div>
              )}
            </div>
          </div>
          {isLocation && (
            <div className='pt-1 px-4'>
              <span className='text-sm font-normal color-gray-medium'>{body}</span>
            </div>
          )}
        </div>
      </Tooltip>
    );
  };

  const isFrustration = isFrustrationEvent(event);

  const mobileTypes = [TYPES.TOUCH, TYPES.SWIPE, TYPES.TAPRAGE]
  return (
    <div
      ref={wrapperRef}
      onMouseLeave={onMouseLeave}
      data-openreplay-label='Event'
      data-type={event.type}
      className={cn(cls.event, {
        [cls.menuClosed]: !menuOpen,
        [cls.highlighted]: showSelection ? selected : isCurrent,
        [cls.selected]: selected,
        [cls.showSelection]: showSelection,
        [cls.red]: isRed,
        [cls.clickType]: event.type === TYPES.CLICK || event.type === TYPES.SWIPE,
        [cls.inputType]: event.type === TYPES.INPUT,
        [cls.frustration]: isFrustration,
        [cls.highlight]: presentInSearch,
        [cls.lastInGroup]: whiteBg,
        ['pl-4 pr-6 ml-4 py-2 border-l']: event.type !== TYPES.LOCATION,
        ['border-0 border-l-0 ml-0']: mobileTypes.includes(event.type),
      })}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {menuOpen && (
        <button onClick={copyHandler} className={cls.contextMenu}>
          {event.target ? 'Copy CSS' : 'Copy URL'}
        </button>
      )}
      <div className={cn(cls.topBlock, 'w-full')}>
        <div className={cn(cls.firstLine, 'w-full')}>{renderBody()}</div>
      </div>
      {isLocation &&
        (event.fcpTime || event.visuallyComplete || event.timeToInteractive) && (
          <LoadInfo
            showInfo={showLoadInfo}
            onClick={toggleLoadInfo}
            event={event}
            prorata={prorata({
              parts: 100,
              elements: {
                a: event.fcpTime,
                b: event.visuallyComplete,
                c: event.timeToInteractive
              },
              startDivisorFn: (elements) => elements / 1.2,
              divisorFn: (elements, parts) => elements / (2 * parts + 1)
            })}
          />
        )}
    </div>
  );
};

export default withOverlay()(Event);
