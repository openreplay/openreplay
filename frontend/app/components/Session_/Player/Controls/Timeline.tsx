import React, { useEffect, useMemo, useContext, useState, useRef } from 'react';
import { connect } from 'react-redux';
import { Icon } from 'UI'
import TimeTracker from './TimeTracker';
import stl from './timeline.module.css';
import { setTimelinePointer, setTimelineHoverTime } from 'Duck/sessions';
import DraggableCircle from './components/DraggableCircle';
import CustomDragLayer, { OnDragCallback } from './components/CustomDragLayer';
import { debounce } from 'App/utils';
import TooltipContainer from './components/TooltipContainer';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { DateTime, Duration } from 'luxon';
import Issue from "Types/session/issue";
import { toJS } from 'mobx'

function getTimelinePosition(value: number, scale: number) {
  const pos = value * scale;

  return pos > 100 ? 99 : pos;
}

interface IProps {
  issues: Issue[]
  setTimelineHoverTime: (t: number) => void
  startedAt: number
  tooltipVisible: boolean
}

function Timeline(props: IProps) {
  const { player, store } = useContext(PlayerContext)
  const [wasPlaying, setWasPlaying] = useState(false)
  const { notesStore, settingsStore } = useStore();
  const {
    playing,
    time,
    skipIntervals,
    skip,
    skipToIssue,
    ready,
    endTime,
    devtoolsLoading,
    domLoading,
    tabStates,
    currentTab,
  } = store.get()
  const { issues } = props;
  const notes = notesStore.sessionNotes

  const progressRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const events = tabStates[currentTab]?.eventList || [];

  const scale = 100 / endTime;

  useEffect(() => {
    const firstIssue = issues[0];

    if (firstIssue && skipToIssue) {
      player.jump(firstIssue.time);
    }
  }, [])

  const debouncedJump = useMemo(() => debounce(player.jump, 500), [])
  const debouncedTooltipChange = useMemo(() => debounce(props.setTimelineHoverTime, 50), [])

  const onDragEnd = () => {
    if (wasPlaying) {
      player.togglePlay();
    }
  };

  const onDrag: OnDragCallback = (offset) => {
    // @ts-ignore react mismatch
    const p = (offset.x) / progressRef.current.offsetWidth;
    const time = Math.max(Math.round(p * endTime), 0);
    debouncedJump(time);
    hideTimeTooltip();
    if (playing) {
      setWasPlaying(true)
      player.pause();
    }
  };

  const showTimeTooltip = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      e.target !== progressRef.current
      && e.target !== timelineRef.current
      // @ts-ignore black magic
      && !progressRef.current.contains(e.target)
    ) {
      return props.tooltipVisible && hideTimeTooltip();
    }

    const time = getTime(e);
    if (!time) return;
    const tz = settingsStore.sessionSettings.timezone.value
    const timeStr = DateTime.fromMillis(props.startedAt + time).setZone(tz).toFormat(`hh:mm:ss a`)
    const timeLineTooltip = {
      time: Duration.fromMillis(time).toFormat(`mm:ss`),
      timeStr,
      offset: e.nativeEvent.pageX,
      isVisible: true,
    };

    debouncedTooltipChange(timeLineTooltip);
  }

  const hideTimeTooltip = () => {
    const timeLineTooltip = { isVisible: false };
    debouncedTooltipChange(timeLineTooltip);
  };

  const seekProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    const time = getTime(e);
    player.jump(time);
    hideTimeTooltip();
  };

  const jumpToTime = (e: React.MouseEvent<HTMLDivElement>) => {
    seekProgress(e);
  };

  const getTime = (e: React.MouseEvent<HTMLDivElement>, customEndTime?: number) => {
    // @ts-ignore react mismatch
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const targetTime = customEndTime || endTime;

    return Math.max(Math.round(p * targetTime), 0);
  };

  return (
    <div
        className="flex items-center absolute w-full"
        style={{
          top: '-4px',
          zIndex: 100,
          maxWidth: 'calc(100% - 1rem)',
          left: '0.5rem',
        }}
      >
        <div
          className={stl.progress}
          onClick={ready ? jumpToTime : undefined }
          ref={progressRef}
          role="button"
          onMouseMoveCapture={showTimeTooltip}
          onMouseEnter={showTimeTooltip}
          onMouseLeave={hideTimeTooltip}
        >
          <TooltipContainer />
          <DraggableCircle
            left={time * scale}
            onDrop={onDragEnd}
          />
          <CustomDragLayer
            onDrag={onDrag}
            minX={0}
            maxX={progressRef.current ? progressRef.current.offsetWidth : 0}
          />
          <TimeTracker scale={scale} left={time * scale} />

          {skip ?
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
          <div className={stl.timeline} ref={timelineRef}>
            {devtoolsLoading || domLoading || !ready ? <div className={stl.stripes} /> : null}
          </div>

          {events.map((e) => (
            <div
              /*@ts-ignore TODO */
              key={e.key}
              className={stl.event}
              style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
            />
          ))}
          {/* TODO: refactor and make any sense out of this */}

          {/*  {issues.map((i: Issue) => (*/}
          {/*  <div*/}
          {/*    key={i.key}*/}
          {/*    className={stl.redEvent}*/}
          {/*    style={{ left: `${getTimelinePosition(i.time, scale)}%` }}*/}
          {/*  />*/}
          {/*))}*/}
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
  (state: any) => ({
    issues: state.getIn(['sessions', 'current']).issues || [],
    startedAt: state.getIn(['sessions', 'current']).startedAt || 0,
    tooltipVisible: state.getIn(['sessions', 'timeLineTooltip', 'isVisible']),
  }),
  { setTimelinePointer, setTimelineHoverTime }
)(observer(Timeline))
