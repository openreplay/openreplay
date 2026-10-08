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
import CustomDragLayer, {
  OnDragCallback,
} from 'Components/Session_/Player/Controls/components/CustomDragLayer';
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
  const [wasPlaying, setWasPlaying] = useState(false);
  const { playing, time, ready, endTime, liveTimeTravel } = store.get();

  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const scale = 100 / endTime;

  const debouncedJump = useMemo(() => debounce(player.jump, 500), []);
  const debouncedTooltipChange = useMemo(
    () => debounce(setTimelineHoverTime, 50),
    [],
  );

  const onDragEnd = () => {
    if (!liveTimeTravel) return;

    if (wasPlaying) {
      player.togglePlay();
    }
  };

  const onDrag: OnDragCallback = (offset: { x: number }) => {
    if (!liveTimeTravel || !progressRef.current) return;

    const p = offset.x / progressRef.current.offsetWidth;
    const time = Math.max(Math.round(p * endTime), 0);
    debouncedJump(time);
    hideTimeTooltip();
    if (playing) {
      setWasPlaying(true);
      player.pause();
    }
  };

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
        <DraggableCircle left={time * scale} onDrop={onDragEnd} live />
        <CustomDragLayer onDrag={onDrag} containerRef={progressRef} />
        <TimeTracker scale={scale} live left={time * scale} />

        <div className={stl.timeline} ref={timelineRef} />
      </div>
    </div>
  );
}

export default observer(Timeline);
