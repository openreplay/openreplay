import { DateTime, Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useContext, useMemo, useRef } from 'react';

import { PlayerContext } from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { signalService } from 'App/services';
import { debounce } from 'App/utils';
import { getLocalHourFormat } from 'App/utils/intlUtils';
import TimelineTracker from 'Components/Session_/Player/Controls/TimelineTracker';
import {
  ExportEventsSelection,
  ZoomDragLayer,
} from 'Components/Session_/Player/Controls/components/ZoomDragLayer';

import { MobEventsList, WebEventsList } from './EventsList';
import IssueMarkersList from './IssueMarkersList';
import SkipIntervalsList from './SkipIntervalsList';
import TooltipContainer from './components/TooltipContainer';
import stl from './timeline.module.css';

function Timeline({
  isMobile,
  inline,
}: {
  isMobile?: boolean;
  /** laid out in the transport row instead of over the controls' top edge */
  inline?: boolean;
}) {
  const { player, store } = useContext(PlayerContext);
  const { settingsStore, uiPlayerStore, sessionStore } = useStore();
  const startedAt = sessionStore.current.startedAt ?? 0;
  const tooltipVisible = sessionStore.timeLineTooltip.isVisible;
  const setTimelineHoverTime = sessionStore.setTimelineTooltip;
  const { timezone } = sessionStore.current;
  const timelineZoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const exportEventsEnabled = uiPlayerStore.exportEventsSelection.enabled;
  const { ready, endTime, devtoolsLoading, domLoading } = store.get();
  const sessionId = sessionStore.current.sessionId;
  const loadingEvents = !sessionStore.current.addedEvents;

  const progressRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const scale = 100 / endTime;

  const debouncedTooltipChange = useMemo(
    () => debounce(setTimelineHoverTime, 50),
    [],
  );

  // the playhead was dragged and let go: one jump, there
  const onSeek = (pct: number) => {
    const time = Math.round((pct / 100) * endTime);
    player.jump(time);
    hideTimeTooltip();
    signalService.send({ source: 'jump', value: time }, sessionId);
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
    tooltipAt(
      time,
      e.clientX - (progressRef.current?.getBoundingClientRect().left ?? 0),
      debouncedTooltipChange,
    );
  };

  const tooltipAt = (
    time: number,
    offset: number,
    set: (tooltip: Record<string, any>) => void,
  ) => {
    const format = getLocalHourFormat();
    const tz = settingsStore.sessionSettings.timezone.value;
    const timeStr = DateTime.fromMillis(startedAt + time)
      .setZone(tz)
      .toFormat(format);
    const userTimeStr = timezone
      ? DateTime.fromMillis(startedAt + time)
          .setZone(timezone)
          .toFormat(format)
      : undefined;

    const timeLineTooltip = {
      time: Duration.fromMillis(time).toFormat('mm:ss'),
      localTime: timeStr,
      userTime: userTimeStr,
      offset,
      isVisible: true,
    };

    set(timeLineTooltip);
  };

  // a held playhead takes the pointer's mouse events, so it drives the
  // tooltip itself, without the hover's debounce
  const onScrub = (pct: number | null) => {
    const width = progressRef.current?.offsetWidth ?? 0;
    if (pct == null || !width) return hideTimeTooltip();
    tooltipAt(
      Math.round((pct / 100) * endTime),
      (pct / 100) * width,
      setTimelineHoverTime,
    );
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
    const box = progressRef.current?.getBoundingClientRect();
    const p = box?.width
      ? Math.min(1, Math.max(0, (e.clientX - box.left) / box.width))
      : 0;
    const targetTime = customEndTime || endTime;

    return Math.max(Math.round(p * targetTime), 0);
  };

  const showLoaderStripes =
    devtoolsLoading || domLoading || !ready || loadingEvents;
  return (
    <div
      className={
        inline
          ? 'relative flex flex-1 min-w-0 items-center'
          : 'flex items-center absolute w-full'
      }
      style={
        inline
          ? undefined
          : {
              top: '-4px',
              zIndex: 100,
              maxWidth: 'calc(100% - 1rem)',
              left: '0.5rem',
            }
      }
    >
      {timelineZoomEnabled ? <ZoomDragLayer scale={scale} /> : null}
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
        <TimelineTracker
          scale={scale}
          trackRef={progressRef}
          onScrub={onScrub}
          onSeek={onSeek}
        />

        <div className={stl.timeline} ref={timelineRef}>
          {showLoaderStripes ? <div className={stl.stripes} /> : null}
        </div>

        {isMobile ? <MobEventsList /> : <WebEventsList />}
        <SkipIntervalsList scale={scale} />
        <IssueMarkersList scale={scale} />
      </div>
    </div>
  );
}

export default observer(Timeline);
