import { Duration } from 'luxon';
import { observer } from 'mobx-react-lite';
import React, { useContext, useMemo, useRef, useState } from 'react';

import {
  ILivePlayerContext,
  PlayerContext,
} from 'App/components/Session/playerContext';
import { useStore } from 'App/mstore';
import { debounce } from 'App/utils';
import TimeTracker from 'Components/Session_/Player/Controls/TimeTracker';
import DraggableCircle from 'Components/Session_/Player/Controls/components/DraggableCircle';
import TooltipContainer from 'Components/Session_/Player/Controls/components/TooltipContainer';
import stl from 'Components/Session_/Player/Controls/timeline.module.css';

function Timeline() {
  const { sessionStore } = useStore();
  const startedAt = sessionStore.current.startedAt ?? 0;
  const tooltipVisible = sessionStore.timeLineTooltip.isVisible;
  const setTimelineHoverTime = sessionStore.setTimelineTooltip;
  // @ts-ignore
  const { player, store } = useContext<ILivePlayerContext>(PlayerContext);
  // while held, the handle and the played part follow the pointer
  const [held, setHeld] = useState<number | null>(null);
  const { time, ready, endTime, liveTimeTravel } = store.get();

  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const scale = 100 / endTime;

  const debouncedTooltipChange = useMemo(
    () => debounce(setTimelineHoverTime, 50),
    [],
  );

  // the playhead moves only while travelling back in time; one jump on release
  const onScrub = (pct: number | null) => {
    if (liveTimeTravel) setHeld(pct);
  };
  const onSeek = (pct: number) => {
    if (liveTimeTravel) {
      player.jump(Math.max(Math.round((pct / 100) * endTime), 0));
      hideTimeTooltip();
    }
    setHeld(null);
  };
  const left = held ?? time * scale;

  const getLiveTime = (e: React.MouseEvent) => {
    const duration = new Date().getTime() - startedAt;
    const rect = progressRef.current?.getBoundingClientRect();
    const p = rect ? (e.clientX - rect.left) / rect.width : 0;
    const time = Math.max(Math.round(p * duration), 0);

    return [time, duration];
  };

  const showTimeTooltip = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== progressRef.current && e.target !== timelineRef.current) {
      return tooltipVisible && hideTimeTooltip();
    }

    const [time, duration] = getLiveTime(e);
    const timeLineTooltip = {
      time: Duration.fromMillis(duration - time).toFormat('-mm:ss'),
      offset: e.nativeEvent.offsetX,
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

  const loadAndSeek = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.persist();
    const result = await player.toggleTimetravel();
    if (result) {
      seekProgress(e);
    }
  };

  const jumpToTime = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!liveTimeTravel) {
      void loadAndSeek(e);
    } else {
      seekProgress(e);
    }
  };

  const getTime = (
    e: React.MouseEvent<HTMLDivElement>,
    customEndTime?: number,
  ) => {
    const rect = progressRef.current?.getBoundingClientRect();
    const p = rect ? (e.clientX - rect.left) / rect.width : 0;
    const targetTime = customEndTime || endTime;

    return Math.max(Math.round(p * targetTime), 0);
  };

  return (
    <div className="relative flex flex-1 min-w-0 items-center">
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
        <DraggableCircle
          left={left}
          live
          trackRef={progressRef}
          onScrub={onScrub}
          onRelease={onSeek}
        />
        <TimeTracker scale={scale} live left={left} />

        <div className={stl.timeline} ref={timelineRef} />
      </div>
    </div>
  );
}

export default observer(Timeline);
