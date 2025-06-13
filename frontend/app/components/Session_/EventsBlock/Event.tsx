import { TYPES } from 'Types/session/event';
import cn from 'classnames';
import copy from 'copy-to-clipboard';
import {
  Angry,
  MessageCircleQuestion,
  MousePointerClick,
  Navigation,
  Pointer,
  TextCursorInput,
} from 'lucide-react';
import React from 'react';
import { Dropdown } from 'antd';

import { prorata, numberWithCommas } from 'App/utils';
import withOverlay from 'Components/hocs/withOverlay';
import { Icon, TextEllipsis, Tooltip } from 'UI';

import LoadInfo from './LoadInfo';
import cls from './event.module.css';
import { useTranslation } from 'react-i18next';

type Props = {
  event: any;
  selected?: boolean;
  isCurrent?: boolean;
  onClick?: () => void;
  showSelection?: boolean;
  toggleLoadInfo?: () => void;
  isRed?: boolean;
  presentInSearch?: boolean;
  whiteBg?: boolean;
};

const isFrustrationEvent = (evt: any): boolean => {
  if (
    evt.type === 'mouse_thrashing' ||
    evt.type === TYPES.CLICKRAGE ||
    evt.type === TYPES.TAPRAGE
  ) {
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
  toggleLoadInfo,
  isRed = false,
  presentInSearch = false,
  whiteBg,
}) => {
  const { t } = useTranslation();
  const isLocation = event.type === TYPES.LOCATION;
  const disableMenu = ![TYPES.CLICK, TYPES.LOCATION].includes(event.type);

  const copyHandler = () => {
    const path = event.selector || event.target.path || event.url || '';
    copy(path);
  };

  const renderBody = () => {
    let title = event.type;
    let body;
    let icon = null;
    let iconName = null;
    const isFrustration = isFrustrationEvent(event);
    const tooltip = { disabled: true, text: '' };

    switch (event.type) {
      case TYPES.LOCATION:
        title = t('Visited');
        body = event.url;
        icon = <Navigation size={16} strokeWidth={1} />;
        break;
      case TYPES.SWIPE:
        title = t('Swipe');
        body = event.direction;
        iconName = `chevron-${event.direction}`;
        break;
      case TYPES.TOUCH:
        title = t('Tapped');
        body = event.label;
        iconName = 'event/click';
        break;
      case TYPES.CLICK:
        title = t('Clicked');
        body = event.label;
        icon = isFrustration ? (
          <MessageCircleQuestion size={16} strokeWidth={1} />
        ) : (
          <Pointer size={16} strokeWidth={1} />
        );
        isFrustration
          ? Object.assign(tooltip, {
              disabled: false,
              text: `${t('User hesitated')} ${Math.round(
                event.hesitation / 1000,
              )}${t('s to perform this event')}`,
            })
          : null;
        break;
      case TYPES.INPUT:
        title = 'Input';
        body = event.value;
        icon = isFrustration ? (
          <MessageCircleQuestion size={16} strokeWidth={1} />
        ) : (
          <TextCursorInput size={16} strokeWidth={1} />
        );
        isFrustration
          ? Object.assign(tooltip, {
              disabled: false,
              text: `${t('User hesitated')} ${Math.round(
                event.hesitation / 1000,
              )}${t('s to enter a value in this input field.')}`,
            })
          : null;
        break;
      case TYPES.CLICKRAGE:
      case TYPES.TAPRAGE:
        title = event.count ? `${event.count} ${t('Clicks')}` : t('Click Rage');
        body = event.label;
        icon = <Angry size={16} strokeWidth={1} />;
        break;
      case TYPES.IOS_VIEW:
        title = t('View');
        body = event.name;
        iconName = 'event/ios_view';
        break;
      case 'mouse_thrashing':
        title = t('Mouse Thrashing');
        icon = <MousePointerClick size={16} strokeWidth={1} />;
        break;
    }

    return (
      <Tooltip
        title={tooltip.text}
        disabled={tooltip.disabled}
        placement="left"
        anchorClassName="w-full"
        containerClassName="w-full"
      >
        <div className={cn(cls.main, 'flex flex-col w-full')}>
          <div
            className={cn('flex items-start w-full', { 'px-4': isLocation })}
          >
            <div style={{ minWidth: '16px' }}>
              {event.type && iconName ? (
                <Icon name={iconName} size="16" color="gray-dark" />
              ) : (
                icon
              )}
            </div>
            <div className="ml-3 w-full">
              <div className="flex w-full items-start">
                <div
                  className="flex flex-col justify-center items-start w-full"
                  style={{ minWidth: '0' }}
                >
                  <span className={cn(cls.title, 'font-medium')}>{title}</span>
                  {body && !isLocation && (
                    <TextEllipsis
                      maxWidth="80%"
                      className="w-full text-sm color-gray-medium"
                      text={body}
                    />
                  )}
                </div>
                {isLocation && event.speedIndex != null && (
                  <div className="color-gray-medium flex font-medium items-center leading-none justify-end">
                    <div className="font-size-10 pr-2">${t('Speed Index')}</div>
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
            <div className="pt-1 px-4">
              <TextEllipsis
                className="text-sm ms-8 font-normal color-gray-medium"
                text={body}
              />
            </div>
          )}
        </div>
      </Tooltip>
    );
  };

  const isFrustration = isFrustrationEvent(event);

  const mobileTypes = [TYPES.TOUCH, TYPES.SWIPE, TYPES.TAPRAGE];
  return (
    <Dropdown
      trigger={['contextMenu']}
      disabled={disableMenu}
      menu={{
        items: [
          {
            key: 'copy',
            label:
              event.type === TYPES.CLICK ? t('Copy selector') : t('Copy URL'),
          },
        ],
        onClick: () => {
          copyHandler();
        },
      }}
    >
      <div
        data-openreplay-label="Event"
        data-type={event.type}
        className={cn(cls.event, {
          [cls.highlighted]: showSelection ? selected : isCurrent,
          [cls.selected]: selected,
          [cls.showSelection]: showSelection,
          [cls.red]: isRed,
          [cls.clickType]:
            event.type === TYPES.CLICK || event.type === TYPES.SWIPE,
          [cls.inputType]: event.type === TYPES.INPUT,
          [cls.frustration]: isFrustration,
          [cls.highlight]: presentInSearch,
          [cls.lastInGroup]: whiteBg,
          'pl-4 pr-6 py-2': event.type !== TYPES.LOCATION,
          'border-0 border-l-0 ml-0': mobileTypes.includes(event.type),
        })}
        onClick={onClick}
      >
        <div className={cn(cls.topBlock, cls.firstLine, 'w-full')}>
          {renderBody()}
        </div>
        {isLocation &&
        (event.fcpTime ||
          event.visuallyComplete ||
          event.timeToInteractive ||
          event.webvitals) ? (
          <LoadInfo
            onClick={toggleLoadInfo}
            event={event}
            webvitals={event.webvitals}
            prorata={prorata({
              parts: 100,
              elements: {
                a: event.fcpTime,
                b: event.visuallyComplete,
                c: event.timeToInteractive,
              },
              startDivisorFn: (elements) => elements / 1.2,
              divisorFn: (elements, parts) => elements / (2 * parts + 1),
            })}
          />
        ) : null}
      </div>
    </Dropdown>
  );
};

export default withOverlay()(Event);
