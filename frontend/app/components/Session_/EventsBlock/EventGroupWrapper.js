import React from 'react';
import cn from 'classnames';

import { TextEllipsis } from 'UI';
import withToggle from 'HOCs/withToggle';
import { TYPES } from 'Types/session/event';
import Event from './Event'
import stl from './eventGroupWrapper.module.css';
import NoteEvent from './NoteEvent';

// TODO: incapsulate toggler in LocationEvent
@withToggle("showLoadInfo", "toggleLoadInfo")
class EventGroupWrapper extends React.Component {

  toggleLoadInfo = (e) => {
    e.stopPropagation();
    this.props.toggleLoadInfo();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.showLoadInfo !== this.props.showLoadInfo || prevProps.query !== this.props.query) {
      this.props.mesureHeight();
    }
  }
  componentDidMount() {
    this.props.toggleLoadInfo(this.props.isFirst)
    this.props.mesureHeight();
  }

  onEventClick = (e) => this.props.onEventClick(e, this.props.event);

  onCheckboxClick = e => this.props.onCheckboxClick(e, this.props.event);

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
      filterOutNote,
    } = this.props;
    const isLocation = event.type === TYPES.LOCATION;

    const whiteBg = isLastInGroup && event.type !== TYPES.LOCATION || (!isLastEvent && event.type !== TYPES.LOCATION)
    const safeRef = String(event.referrer || '');
    return (
      <div
        className={
          cn(stl.container, "!py-1", {
            [stl.last]: isLastInGroup,
            [stl.first]: event.type === TYPES.LOCATION,
            [stl.dashAfter]: isLastInGroup && !isLastEvent,
          }, isLastInGroup && '!pb-2', event.type === TYPES.LOCATION && "!pt-2 !pb-2")
        }
      >
        { isFirst && isLocation && event.referrer &&
          <div className={ stl.referrer }>
            <TextEllipsis>
              Referrer: <span className={stl.url}>{safeRef}</span>
            </TextEllipsis>
          </div>
        }
        {isNote ? (
          <NoteEvent
            userId={event.userId}
            timestamp={event.timestamp}
            tags={event.tags}
            isPublic={event.isPublic}
            message={event.message}
            sessionId={event.sessionId}
            date={event.createdAt}
            noteId={event.noteId}
            filterOutNote={filterOutNote}
          />
        ) : isLocation
          ? <Event
              extended={isFirst}
              key={ event.key }
              event={ event }
              onClick={ this.onEventClick }
              selected={ isSelected }
              showLoadInfo={ showLoadInfo }
              toggleLoadInfo={ this.toggleLoadInfo }
              isCurrent={ isCurrent }
              presentInSearch={presentInSearch}
              isLastInGroup={isLastInGroup}
              whiteBg={whiteBg}
            />
          : <Event
              key={ event.key }
              event={ event }
              onClick={ this.onEventClick }
              onCheckboxClick={ this.onCheckboxClick }
              selected={ isSelected }
              isCurrent={ isCurrent }
              showSelection={ showSelection }
              overlayed={ isEditing }
              presentInSearch={presentInSearch}
              isLastInGroup={isLastInGroup}
              whiteBg={whiteBg}
            />}
      </div>
    )
  }
}

export default EventGroupWrapper
