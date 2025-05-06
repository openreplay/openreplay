import { TYPES } from 'Types/session/event';
import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import UxtEvent from 'Components/Session_/EventsBlock/UxtEvent';
import { Icon, TextEllipsis } from 'UI';

import cn from 'classnames';
import Event from './Event';
import NoteEvent from './NoteEvent';
import stl from './eventGroupWrapper.module.css';
import { useTranslation } from 'react-i18next';

function EventGroupWrapper(props) {
  const { userStore } = useStore();
  const currentUserId = userStore.account.id;

  const onEventClick = (e) => props.onEventClick(e, props.event);

  const onCheckboxClick = (e) => props.onCheckboxClick(e, props.event);

  const {
    event,
    isLastEvent,
    isLastInGroup,
    isSelected,
    isCurrent,
    isEditing,
    showSelection,
    isFirst,
    presentInSearch,
    isNote,
    isTabChange,
    filterOutNote,
  } = props;
  const { t } = useTranslation();
  const isLocation = event.type === TYPES.LOCATION;
  const isUxtEvent = event.type === TYPES.UXT_EVENT;

  const whiteBg =
    (isLastInGroup && event.type !== TYPES.LOCATION) ||
    (!isLastEvent && event.type !== TYPES.LOCATION);
  const safeRef = String(event.referrer || '');

  const returnEvt = () => {
    if (isUxtEvent) {
      return <UxtEvent event={event} />;
    }
    if (isNote) {
      return (
        <NoteEvent
          setActiveTab={props.setActiveTab}
          note={event}
          filterOutNote={filterOutNote}
          noEdit={currentUserId !== event.userId}
        />
      );
    }
    if (isLocation) {
      return (
        <Event
          extended={isFirst}
          key={event.key}
          event={event}
          onClick={onEventClick}
          selected={isSelected}
          showLoadInfo
          isCurrent={isCurrent}
          presentInSearch={presentInSearch}
          isLastInGroup={isLastInGroup}
          whiteBg
        />
      );
    }
    if (isTabChange) {
      return (
        <TabChange
          onClick={onEventClick}
          from={event.fromTab}
          to={event.toTab}
          activeUrl={event.activeUrl}
        />
      );
    }
    return (
      <Event
        key={event.key}
        event={event}
        onClick={onEventClick}
        onCheckboxClick={onCheckboxClick}
        selected={isSelected}
        isCurrent={isCurrent}
        showSelection={showSelection}
        overlayed={isEditing}
        presentInSearch={presentInSearch}
        isLastInGroup={isLastInGroup}
        whiteBg={whiteBg}
      />
    );
  };

  const shadowColor = props.isPrev
    ? '#A7BFFF'
    : props.isCurrent
      ? '#394EFF'
      : 'transparent';
  return (
    <>
      <div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1.5,
            height: '100%',
            backgroundColor: shadowColor,
            zIndex: 98,
          }}
        />
        {props.isCurrent ? (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: -10,
              width: 10,
              height: 10,
              transform: 'rotate(45deg) translate(0, -50%)',
              background: '#394EFF',
              zIndex: 99,
              borderRadius: '.15rem',
            }}
          />
        ) : null}
        {isFirst && isLocation && event.referrer && (
          <TextEllipsis>
            <div className={stl.referrer}>
              {t('Referrer:')}{' '}
              <span className={cn(stl.url, '!font-normal')}>{safeRef}</span>
            </div>
          </TextEllipsis>
        )}
        {returnEvt()}
      </div>
      {isLastInGroup && !isTabChange && (
        <div className="border-color-gray-light-shade" />
      )}
    </>
  );
}

function TabChange({ from, to, activeUrl, onClick }) {
  if (!from) {
    return null;
  }
  return (
    <div
      onClick={onClick}
      className="cursor-pointer bg-gray-lightest w-full py-2 border-b hover:bg-active-blue"
    >
      <div className="flex items-center gap-2 px-4">
        <span style={{ fontWeight: 500 }}>{from}</span>
        <Icon name="arrow-right-short" size={18} color="gray-dark" />
        <span style={{ fontWeight: 500 }}>{to}</span>
      </div>
      <div className="break-words mt-1 px-4 text-sm font-normal color-gray-medium whitespace-nowrap">
        {activeUrl}
      </div>
    </div>
  );
};

export default observer(EventGroupWrapper);
