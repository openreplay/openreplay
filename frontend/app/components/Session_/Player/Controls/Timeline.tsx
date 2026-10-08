import { DateTime, Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useContext, useMemo, useRef, useState } from 'react';

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
import CustomDragLayer, { OnDragCallback } from './components/CustomDragLayer';
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
  const [wasPlaying, setWasPlaying] = useState(false);
  const { settingsStore, uiPlayerStore, sessionStore } = useStore();
  const startedAt = sessionStore.current.startedAt ?? 0;
  const tooltipVisible = sessionStore.timeLineTooltip.isVisible;
  const setTimelineHoverTime = sessionStore.setTimelineTooltip;
  const { timezone } = sessionStore.current;
  const timelineZoomEnabled = uiPlayerStore.timelineZoom.enabled;
  const exportEventsEnabled = uiPlayerStore.exportEventsSelection.enabled;
  const { playing, ready, endTime, devtoolsLoading, domLoading } = store.get();
  const sessionId = sessionStore.current.sessionId;
  const loadingEvents = !sessionStore.current.addedEvents;

  const progressRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const scale = 100 / endTime;

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
    const width = progressRef.current?.offsetWidth;
    if (!width) return;
    const time = Math.round((offset.x / width) * endTime);
    debouncedJump(time);
    hideTimeTooltip();
    signalService.send(
      {
        source: 'jump',
        value: time,
      },
      sessionId,
    );
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
      offset:
        e.clientX - (progressRef.current?.getBoundingClientRect().left ?? 0),
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
        <TimelineTracker scale={scale} onDragEnd={onDragEnd} />
        <CustomDragLayer onDrag={onDrag} containerRef={progressRef} />

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
