import React, { useEffect, useMemo, useContext, useState, useRef } from 'react';
import { debounce } from 'App/utils';
import { PlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import { DateTime, Duration } from 'luxon';
import { WebEventsList, MobEventsList } from './EventsList';
import NotesList from './NotesList';
import SkipIntervalsList from './SkipIntervalsList';
import TimelineTracker from 'Components/Session_/Player/Controls/TimelineTracker';
import {
  ZoomDragLayer,
  HighlightDragLayer,
  ExportEventsSelection
} from "Components/Session_/Player/Controls/components/ZoomDragLayer";
import stl from './timeline.module.css'
import TooltipContainer from './components/TooltipContainer';
import CustomDragLayer, { OnDragCallback } from './components/CustomDragLayer';

function Timeline({ isMobile }: { isMobile: boolean }) {
  const { player, store } = useContext(PlayerContext);
  const [wasPlaying, setWasPlaying] = useState(false);
  const [maxWidth, setMaxWidth] = useState(0);
  const { settingsStore, uiPlayerStore, sessionStore } = useStore();
  const startedAt = sessionStore.current.startedAt ?? 0;
  const tooltipVisible = sessionStore.timeLineTooltip.isVisible;
  const setTimelineHoverTime = sessionStore.setTimelineTooltip;
  const { timezone } = sessionStore.current;
  const issues = sessionStore.current.issues ?? [];
  const timelineZoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const exportEventsEnabled = uiPlayerStore.exportEventsSelection.enabled;
  const highlightEnabled = uiPlayerStore.highlightSelection.enabled;
  const { playing, skipToIssue, ready, endTime, devtoolsLoading, domLoading } =
    store.get();

  const progressRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const scale = 100 / endTime;

  useEffect(() => {
    const firstIssue = issues[0];

    if (firstIssue && skipToIssue) {
      player.jump(firstIssue.time);
    }
    if (progressRef.current) {
      setMaxWidth(progressRef.current.clientWidth);
    }
  }, []);

  const debouncedJump = useMemo(() => debounce(player.jump, 500), []);
  const debouncedTooltipChange = useMemo(
    () => debounce(setTimelineHoverTime, 50),
    [],
  );

  const onDragEnd = () => {
    if (wasPlaying) {
      player.togglePlay();
    }
  };

  const onDrag: OnDragCallback = (offset) => {
    // @ts-ignore react mismatch
    const p = offset.x / progressRef.current.offsetWidth;
    const time = Math.max(Math.round(p * endTime), 0);
    debouncedJump(time);
    hideTimeTooltip();
    if (playing) {
      setWasPlaying(true);
      player.pause();
    }
  };

  const showTimeTooltip = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      e.target !== progressRef.current &&
      e.target !== timelineRef.current &&
      // @ts-ignore black magic
      !progressRef.current.contains(e.target)
    ) {
      return tooltipVisible && hideTimeTooltip();
    }

    const time = getTime(e);
    if (!time) return;
    const tz = settingsStore.sessionSettings.timezone.value;
    const timeStr = DateTime.fromMillis(startedAt + time)
      .setZone(tz)
      .toFormat('hh:mm:ss a');
    const userTimeStr = timezone
      ? DateTime.fromMillis(startedAt + time)
          .setZone(timezone)
          .toFormat('hh:mm:ss a')
      : undefined;

    const timeLineTooltip = {
      time: Duration.fromMillis(time).toFormat('mm:ss'),
      localTime: timeStr,
      userTime: userTimeStr,
      offset: e.nativeEvent.pageX,
      isVisible: true,
    };

    debouncedTooltipChange(timeLineTooltip);
  };

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
    if ((e.target as HTMLDivElement).id === 'click-ignore') {
      return;
    }
    seekProgress(e);
  };

  const getTime = (
    e: React.MouseEvent<HTMLDivElement>,
    customEndTime?: number,
  ) => {
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
      {timelineZoomEnabled ? <ZoomDragLayer scale={scale} /> : null}
      {highlightEnabled ? <HighlightDragLayer scale={scale} /> : null}
      {exportEventsEnabled ? <ExportEventsSelection scale={scale} /> : null}
      <div
        className={stl.progress}
        onClick={ready ? jumpToTime : undefined}
        ref={progressRef}
        role="button"
        onMouseMoveCapture={showTimeTooltip}
        onMouseEnter={showTimeTooltip}
        onMouseLeave={hideTimeTooltip}
      >
        <TooltipContainer />
        {highlightEnabled ? null : (
          <TimelineTracker scale={scale} onDragEnd={onDragEnd} />
        )}
        <CustomDragLayer onDrag={onDrag} minX={0} maxX={maxWidth} />

        <div className={stl.timeline} ref={timelineRef}>
          {devtoolsLoading || domLoading || !ready ? (
            <div className={stl.stripes} />
          ) : null}
        </div>

        {isMobile ? <MobEventsList /> : <WebEventsList />}
        <NotesList scale={scale} />
        <SkipIntervalsList scale={scale} />

        {/* TODO: refactor and make any sense out of this */}

        {/*  {issues.map((i: Issue) => ( */}
        {/*  <div */}
        {/*    key={i.key} */}
        {/*    className={stl.redEvent} */}
        {/*    style={{ left: `${getTimelinePosition(i.time, scale)}%` }} */}
        {/*  /> */}
        {/* ))} */}
      </div>
    </div>
  );
}

export default observer(Timeline);
