import React from 'react';
import { connect } from 'react-redux';
import { Icon } from 'UI'
import TimeTracker from './TimeTracker';
import stl from './timeline.module.css';
import { setTimelinePointer, setTimelineHoverTime } from 'Duck/sessions';
import DraggableCircle from './DraggableCircle';
import CustomDragLayer from './CustomDragLayer';
import { debounce } from 'App/utils';
import TooltipContainer from './components/TooltipContainer';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';

const BOUNDRY = 0;

function getTimelinePosition(value, scale) {
  const pos = value * scale;

  return pos > 100 ? 99 : pos;
}

let deboucneJump = () => null;
let debounceTooltipChange = () => null;


function Timeline(props) {
  const { player, store } = React.useContext(PlayerContext)
  const [wasPlaying, setWasPlaying] = React.useState(false);
  const { notesStore } = useStore();
  const {
    playing,
    time,
    skipIntervals,
    eventList: events,
    skip,
    skipToIssue,
    disabled,
    endTime,
    live,
  } = store.get()
  const notes = notesStore.sessionNotes

  const progressRef = React.useRef();
  const timelineRef = React.useRef();


  const scale = 100 / endTime;

  React.useEffect(() => {
    const { issues } = props;
    const firstIssue = issues.get(0);
    deboucneJump = debounce(player.jump, 500);
    debounceTooltipChange = debounce(props.setTimelineHoverTime, 50);

    if (firstIssue && skipToIssue) {
      player.jump(firstIssue.time);
    }
  }, [])

  const onDragEnd = () => {
    if (live && !liveTimeTravel) return;

    if (wasPlaying) {
      player.togglePlay();
    }
  };

  const onDrag = (offset) => {
    if (live && !liveTimeTravel) return;

    const p = (offset.x - BOUNDRY) / progressRef.current.offsetWidth;
    const time = Math.max(Math.round(p * endTime), 0);
    deboucneJump(time);
    hideTimeTooltip();
    if (playing) {
      setWasPlaying(true)
      player.pause();
    }
  };

  const getLiveTime = (e) => {
    const duration = new Date().getTime() - startedAt;
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const time = Math.max(Math.round(p * duration), 0);

    return [time, duration];
  };

  const showTimeTooltip = (e) => {
    if (e.target !== progressRef.current && e.target !== timelineRef.current) {
      return props.tooltipVisible && hideTimeTooltip();
    }


    let timeLineTooltip;

    if (live) {
      const [time, duration] = getLiveTime(e);
      timeLineTooltip = {
        time: duration - time,
        offset: e.nativeEvent.offsetX,
        isVisible: true,
      };
    } else {
      const time = getTime(e);
      timeLineTooltip = {
        time: time,
        offset: e.nativeEvent.offsetX,
        isVisible: true,
      };
    }

    debounceTooltipChange(timeLineTooltip);
  };

  const hideTimeTooltip = () => {
    const timeLineTooltip = { isVisible: false };
    debounceTooltipChange(timeLineTooltip);
  };

  const seekProgress = (e) => {
    const time = getTime(e);
    player.jump(time);
    hideTimeTooltip();
  };

  const loadAndSeek = async (e) => {
    e.persist();
    await toggleTimetravel();

    setTimeout(() => {
      seekProgress(e);
    });
  };

  const jumpToTime = (e) => {
    if (live && !liveTimeTravel) {
      loadAndSeek(e);
    } else {
      seekProgress(e);
    }
  };

  const getTime = (e, customEndTime) => {
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const targetTime = customEndTime || endTime;
    const time = Math.max(Math.round(p * targetTime), 0);

    return time;
  };

  return (
    <div
        className="flex items-center absolute w-full"
        style={{
          top: '-4px',
          zIndex: 100,
          padding: `0 ${BOUNDRY}px`,
          maxWidth: 'calc(100% - 1rem)',
          left: '0.5rem',
        }}
      >
        <div
          className={stl.progress}
          onClick={disabled ? null : jumpToTime}
          ref={progressRef}
          role="button"
          onMouseMoveCapture={showTimeTooltip}
          onMouseEnter={showTimeTooltip}
          onMouseLeave={hideTimeTooltip}
        >
          <TooltipContainer live={live} />
          {/* custo color is live */}
          <DraggableCircle
            left={time * scale}
            onDrop={onDragEnd}
            live={live}
          />
          <CustomDragLayer
            onDrag={onDrag}
            minX={BOUNDRY}
            maxX={progressRef.current && progressRef.current.offsetWidth + BOUNDRY}
          />
          <TimeTracker scale={scale} live={live} left={time * scale} />

          {!live && skip ?
            skipIntervals.map((interval) => (
              <div
                key={interval.start}
                className={stl.skipInterval}
                style={{
                  left: `${getTimelinePosition(interval.start, scale)}%`,
                  width: `${(interval.end - interval.start) * scale}%`,
                }}
              />
            )) : null}
          <div className={stl.timeline} ref={timelineRef} />

          {events.map((e) => (
            <div
              key={e.key}
              className={stl.event}
              style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
            />
          ))}
          {notes.map((note) => note.timestamp > 0 ? (
            <div
              key={note.noteId}
              style={{
                position: 'absolute',
                background: 'white',
                zIndex: 3,
                pointerEvents: 'none',
                height: 10,
                width: 16,
                left: `${getTimelinePosition(note.timestamp, scale)}%`,
              }}
            >
              <Icon name="quotes" style={{ width: 16, height: 10 }} color="main" />
            </div>
          ) : null)}
        </div>
      </div>
  )
}

export default connect(
  (state) => ({
    issues: state.getIn(['sessions', 'current', 'issues']),
    startedAt: state.getIn(['sessions', 'current', 'startedAt']),
    tooltipVisible: state.getIn(['sessions', 'timeLineTooltip', 'isVisible']),
  }),
  { setTimelinePointer, setTimelineHoverTime }
)(observer(Timeline))
