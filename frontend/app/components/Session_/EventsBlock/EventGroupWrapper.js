import UxtEvent from "Components/Session_/EventsBlock/UxtEvent";
import React from 'react';
import { durationFromMsFormatted } from "App/date";
import { connect } from 'react-redux';
import { TextEllipsis, Icon } from 'UI';
import withToggle from 'HOCs/withToggle';
import { TYPES } from 'Types/session/event';
import Event from './Event';
import stl from './eventGroupWrapper.module.css';
import NoteEvent from './NoteEvent';
import { setEditNoteTooltip } from 'Duck/sessions';

// TODO: incapsulate toggler in LocationEvent
@withToggle('showLoadInfo', 'toggleLoadInfo')
@connect(
  (state) => ({
    members: state.getIn(['members', 'list']),
    currentUserId: state.getIn(['user', 'account', 'id'])
  }),
  { setEditNoteTooltip }
)
class EventGroupWrapper extends React.Component {
  toggleLoadInfo = (e) => {
    e.stopPropagation();
    this.props.toggleLoadInfo();
  };

  componentDidUpdate(prevProps) {
    if (
      prevProps.showLoadInfo !== this.props.showLoadInfo ||
      prevProps.query !== this.props.query ||
      prevProps.event.timestamp !== this.props.event.timestamp ||
      prevProps.isNote !== this.props.isNote
    ) {
      this.props.mesureHeight();
    }
  }

  componentDidMount() {
    this.props.toggleLoadInfo(this.props.isFirst);
    this.props.mesureHeight();
  }

  onEventClick = (e) => this.props.onEventClick(e, this.props.event);

  onCheckboxClick = (e) => this.props.onCheckboxClick(e, this.props.event);

  render() {
    const {
      event,
      isLastEvent,
      isLastInGroup,
      isSelected,
      isCurrent,
      isEditing,
      showSelection,
      showLoadInfo,
      isFirst,
      presentInSearch,
      isNote,
      isTabChange,
      filterOutNote,
    } = this.props;
    const isLocation = event.type === TYPES.LOCATION;
    const isUxtEvent = event.type === TYPES.UXT_EVENT;

    const whiteBg =
      (isLastInGroup && event.type !== TYPES.LOCATION) ||
      (!isLastEvent && event.type !== TYPES.LOCATION);
    const safeRef = String(event.referrer || '');

    const returnEvt = () => {
      if (isUxtEvent) {
        return (
          <UxtEvent event={event} />
        )
      }
      if (isNote) {
        return (
          <NoteEvent
            note={event}
            filterOutNote={filterOutNote}
            onEdit={this.props.setEditNoteTooltip}
            noEdit={this.props.currentUserId !== event.userId}
          />
        )
      }
      if (isLocation) {
        return (
          <Event
            extended={isFirst}
            key={event.key}
            event={event}
            onClick={this.onEventClick}
            selected={isSelected}
            showLoadInfo={showLoadInfo}
            toggleLoadInfo={this.toggleLoadInfo}
            isCurrent={isCurrent}
            presentInSearch={presentInSearch}
            isLastInGroup={isLastInGroup}
            whiteBg={true}
          />
        )
      }
      if (isTabChange) {
        return (
          <TabChange onClick={this.onEventClick} from={event.fromTab} to={event.toTab} activeUrl={event.activeUrl} />
        )
      }
      return (
        <Event
          key={event.key}
          event={event}
          onClick={this.onEventClick}
          onCheckboxClick={this.onCheckboxClick}
          selected={isSelected}
          isCurrent={isCurrent}
          showSelection={showSelection}
          overlayed={isEditing}
          presentInSearch={presentInSearch}
          isLastInGroup={isLastInGroup}
          whiteBg={whiteBg}
        />
      )
    }
    return (
      <>
        <div>
          {isFirst && isLocation && event.referrer && (
            <TextEllipsis>
              <div className={stl.referrer}>
                Referrer: <span className={stl.url}>{safeRef}</span>
              </div>
            </TextEllipsis>
          )}
          {returnEvt()}
        </div>
        {(isLastInGroup && !isTabChange) && <div className='border-color-gray-light-shade' />}
      </>
    );
  }
}

function TabChange({ from, to, activeUrl, onClick }) {
    if (!from) {
        return null;
    }
    return (
        <div
            onClick={onClick}
            className={'cursor-pointer bg-gray-lightest w-full py-2 border-b hover:bg-active-blue'}
        >
            <div className={'flex items-center gap-2 px-4'}>
              <span style={{ fontWeight: 500 }}>
                {from}
              </span>
              <Icon name={"arrow-right-short"} size={18} color={"gray-dark"}/>
              <span style={{ fontWeight: 500 }}>
                {to}
              </span>
            </div>
            <div className={'break-words mt-1 px-4 text-sm font-normal color-gray-medium whitespace-nowrap'}>
                {activeUrl}
            </div>
        </div>
    )
}

export default EventGroupWrapper;
