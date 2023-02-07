import React, { useMemo, useContext, useState, useRef } from 'react';
import { connect } from 'react-redux';
import TimeTracker from 'Components/Session_/Player/Controls/TimeTracker';
import stl from 'Components/Session_/Player/Controls/timeline.module.css';
import { setTimelinePointer, setTimelineHoverTime } from 'Duck/sessions';
import DraggableCircle from 'Components/Session_/Player/Controls/components/DraggableCircle';
import CustomDragLayer, { OnDragCallback } from 'Components/Session_/Player/Controls/components/CustomDragLayer';
import { debounce } from 'App/utils';
import TooltipContainer from 'Components/Session_/Player/Controls/components/TooltipContainer';
import { PlayerContext, ILivePlayerContext } from 'App/components/Session/playerContext';
import { observer } from 'mobx-react-lite';
import { Duration } from 'luxon';

interface IProps {
  setTimelineHoverTime: (t: number) => void
  startedAt: number
  tooltipVisible: boolean
}

function Timeline(props: IProps) {
  // @ts-ignore
  const { player, store } = useContext<ILivePlayerContext>(PlayerContext)
  const [wasPlaying, setWasPlaying] = useState(false)
  const {
    playing,
    time,
    ready,
    endTime,
    liveTimeTravel,
  } = store.get()

  const timelineRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const scale = 100 / endTime;

  const debouncedJump = useMemo(() => debounce(player.jump, 500), [])
  const debouncedTooltipChange = useMemo(() => debounce(props.setTimelineHoverTime, 50), [])

  const onDragEnd = () => {
    if (!liveTimeTravel) return;

    if (wasPlaying) {
      player.togglePlay();
    }
  };

  const onDrag: OnDragCallback = (offset: { x: number }) => {
    if ((!liveTimeTravel) || !progressRef.current) return;

    const p = (offset.x) / progressRef.current.offsetWidth;
    const time = Math.max(Math.round(p * endTime), 0);
    debouncedJump(time);
    hideTimeTooltip();
    if (playing) {
      setWasPlaying(true)
      player.pause();
    }
  };

  const getLiveTime = (e: React.MouseEvent) => {
    const duration = new Date().getTime() - props.startedAt;
    // @ts-ignore type mismatch from react?
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const time = Math.max(Math.round(p * duration), 0);

    return [time, duration];
  };

  const showTimeTooltip = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== progressRef.current && e.target !== timelineRef.current) {
      return props.tooltipVisible && hideTimeTooltip();
    }

    const [time, duration] = getLiveTime(e);
    const timeLineTooltip = {
      time: Duration.fromMillis(duration - time).toFormat(`-mm:ss`),
      offset: e.nativeEvent.offsetX,
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

  const getTime = (e: React.MouseEvent<HTMLDivElement>, customEndTime?: number) => {
    // @ts-ignore type mismatch from react?
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
        <TooltipContainer live />
        <DraggableCircle
          left={time * scale}
          onDrop={onDragEnd}
          live
        />
        <CustomDragLayer
          onDrag={onDrag}
          minX={0}
          maxX={progressRef.current ? progressRef.current.offsetWidth : 0}
        />
        <TimeTracker scale={scale} live left={time * scale} />


        <div className={stl.timeline} ref={timelineRef} />
      </div>
    </div>
  )
}

export default connect(
  (state: any) => ({
    startedAt: state.getIn(['sessions', 'current']).startedAt || 0,
    tooltipVisible: state.getIn(['sessions', 'timeLineTooltip', 'isVisible']),
  }),
  { setTimelinePointer, setTimelineHoverTime }
)(observer(Timeline))
