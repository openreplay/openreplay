import React from 'react';
import { connect } from 'react-redux';
import { connectPlayer, Controls, toggleTimetravel } from 'Player';
import TimeTracker from './TimeTracker';
import stl from './timeline.module.css';
import { setTimelinePointer, setTimelineHoverTime } from 'Duck/sessions';
import DraggableCircle from './DraggableCircle';
import CustomDragLayer from './CustomDragLayer';
import { debounce } from 'App/utils';
import TooltipContainer from './components/TooltipContainer';

const BOUNDRY = 0;

function getTimelinePosition(value, scale) {
  const pos = value * scale;

  return pos > 100 ? 99 : pos;
}

let deboucneJump = () => null;
let debounceTooltipChange = () => null;
@connectPlayer((state) => ({
  playing: state.playing,
  time: state.time,
  skipIntervals: state.skipIntervals,
  events: state.eventList,
  skip: state.skip,
  // not updating properly rn
  // skipToIssue: state.skipToIssue,
  disabled: state.cssLoading || state.messagesLoading || state.markedTargets,
  endTime: state.endTime,
  live: state.live,
  logList: state.logList,
  exceptionsList: state.exceptionsList,
  resourceList: state.resourceList,
  stackList: state.stackList,
  fetchList: state.fetchList,
}))
@connect(
  (state) => ({
    issues: state.getIn(['sessions', 'current', 'issues']),
    startedAt: state.getIn(['sessions', 'current', 'startedAt']),
    clickRageTime:
      state.getIn(['sessions', 'current', 'clickRage']) &&
      state.getIn(['sessions', 'current', 'clickRageTime']),
    returningLocationTime:
      state.getIn(['sessions', 'current', 'returningLocation']) &&
      state.getIn(['sessions', 'current', 'returningLocationTime']),
    tooltipVisible: state.getIn(['sessions', 'timeLineTooltip', 'isVisible']),
  }),
  { setTimelinePointer, setTimelineHoverTime }
)
export default class Timeline extends React.PureComponent {
  progressRef = React.createRef();
  timelineRef = React.createRef();
  wasPlaying = false;

  seekProgress = (e) => {
    const time = this.getTime(e);
    this.props.jump(time);
    this.hideTimeTooltip();
  };

  loadAndSeek = async (e) => {
    e.persist();
    await toggleTimetravel();

    setTimeout(() => {
      this.seekProgress(e);
    });
  };

  jumpToTime = (e) => {
    if (this.props.live && !this.props.liveTimeTravel) {
      this.loadAndSeek(e);
    } else {
      this.seekProgress(e);
    }
  };

  getTime = (e, customEndTime) => {
    const { endTime } = this.props;
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const targetTime = customEndTime || endTime;
    const time = Math.max(Math.round(p * targetTime), 0);

    return time;
  };

  createEventClickHandler = (pointer) => (e) => {
    e.stopPropagation();
    this.props.jump(pointer.time);
    this.props.setTimelinePointer(pointer);
  };

  componentDidMount() {
    const { issues } = this.props;
    const skipToIssue = Controls.updateSkipToIssue();
    const firstIssue = issues.get(0);
    deboucneJump = debounce(this.props.jump, 500);
    debounceTooltipChange = debounce(this.props.setTimelineHoverTime, 50);

    if (firstIssue && skipToIssue) {
      this.props.jump(firstIssue.time);
    }
  }

  onDragEnd = () => {
    const { live, liveTimeTravel } = this.props;
    if (live && !liveTimeTravel) return;

    if (this.wasPlaying) {
      this.props.togglePlay();
    }
  };

  onDrag = (offset) => {
    const { endTime, live, liveTimeTravel } = this.props;
    if (live && !liveTimeTravel) return;

    const p = (offset.x - BOUNDRY) / this.progressRef.current.offsetWidth;
    const time = Math.max(Math.round(p * endTime), 0);
    deboucneJump(time);
    this.hideTimeTooltip();
    if (this.props.playing) {
      this.wasPlaying = true;
      this.props.pause();
    }
  };

  getLiveTime = (e) => {
    const { startedAt } = this.props;
    const duration = new Date().getTime() - startedAt;
    const p = e.nativeEvent.offsetX / e.target.offsetWidth;
    const time = Math.max(Math.round(p * duration), 0);

    return [time, duration];
  };

  showTimeTooltip = (e) => {
    if (e.target !== this.progressRef.current && e.target !== this.timelineRef.current) {
      return this.props.tooltipVisible && this.hideTimeTooltip();
    }

    const { live } = this.props;
    let timeLineTooltip;

    if (live) {
      const [time, duration] = this.getLiveTime(e);
      timeLineTooltip = {
        time: duration - time,
        offset: e.nativeEvent.offsetX,
        isVisible: true,
      };
    } else {
      const time = this.getTime(e);
      timeLineTooltip = {
        time: time,
        offset: e.nativeEvent.offsetX,
        isVisible: true,
      };
    }

    debounceTooltipChange(timeLineTooltip);
  };

  hideTimeTooltip = () => {
    const timeLineTooltip = { isVisible: false };
    debounceTooltipChange(timeLineTooltip);
  };

  render() {
    const { events, skip, skipIntervals, disabled, endTime, live } = this.props;

    const scale = 100 / endTime;

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
          onClick={disabled ? null : this.jumpToTime}
          ref={this.progressRef}
          role="button"
          onMouseMoveCapture={this.showTimeTooltip}
          onMouseEnter={this.showTimeTooltip}
          onMouseLeave={this.hideTimeTooltip}
        >
          <TooltipContainer live={live} />
          {/* custo color is live */}
          <DraggableCircle
            left={this.props.time * scale}
            onDrop={this.onDragEnd}
            live={this.props.live}
          />
          <CustomDragLayer
            onDrag={this.onDrag}
            minX={BOUNDRY}
            maxX={this.progressRef.current && this.progressRef.current.offsetWidth + BOUNDRY}
          />
          <TimeTracker scale={scale} live={this.props.live} left={this.props.time * scale} />

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
          <div className={stl.timeline} ref={this.timelineRef} />

          {events.map((e) => (
            <div
              key={e.key}
              className={stl.event}
              style={{ left: `${getTimelinePosition(e.time, scale)}%` }}
            />
          ))}
        </div>
      </div>
    );
  }
}
