import React from 'react';
import { connect } from 'react-redux';
import cn from 'classnames';
import { connectPlayer, Controls } from 'Player';
import { TimelinePointer, Icon } from 'UI';
import TimeTracker from './TimeTracker';
import stl from './timeline.module.css';
import { TYPES } from 'Types/session/event';
import { setTimelinePointer, setTimelineHoverTime } from 'Duck/sessions';
import DraggableCircle from './DraggableCircle';
import CustomDragLayer from './CustomDragLayer';
import { debounce } from 'App/utils';
import { Tooltip } from 'react-tippy';
import TooltipContainer from './components/TooltipContainer';

const BOUNDRY = 0;

function getTimelinePosition(value, scale) {
    const pos = value * scale;

    return pos > 100 ? 99 : pos;
}

const getPointerIcon = (type) => {
    // exception,
    switch (type) {
        case 'fetch':
            return 'funnel/file-earmark-minus-fill';
        case 'exception':
            return 'funnel/exclamation-circle-fill';
        case 'log':
            return 'funnel/exclamation-circle-fill';
        case 'stack':
            return 'funnel/patch-exclamation-fill';
        case 'resource':
            return 'funnel/file-earmark-minus-fill';

        case 'dead_click':
            return 'funnel/dizzy';
        case 'click_rage':
            return 'funnel/dizzy';
        case 'excessive_scrolling':
            return 'funnel/mouse';
        case 'bad_request':
            return 'funnel/file-medical-alt';
        case 'missing_resource':
            return 'funnel/file-earmark-minus-fill';
        case 'memory':
            return 'funnel/sd-card';
        case 'cpu':
            return 'funnel/microchip';
        case 'slow_resource':
            return 'funnel/hourglass-top';
        case 'slow_page_load':
            return 'funnel/hourglass-top';
        case 'crash':
            return 'funnel/file-exclamation';
        case 'js_exception':
            return 'funnel/exclamation-circle-fill';
    }

    return 'info';
};

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
        clickRageTime: state.getIn(['sessions', 'current', 'clickRage']) && state.getIn(['sessions', 'current', 'clickRageTime']),
        returningLocationTime:
            state.getIn(['sessions', 'current', 'returningLocation']) && state.getIn(['sessions', 'current', 'returningLocationTime']),
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

    getTime = (e) => {
        const { endTime } = this.props;
        const p = e.nativeEvent.offsetX / e.target.offsetWidth;
        const time = Math.max(Math.round(p * endTime), 0);

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
        if (this.wasPlaying) {
            this.props.togglePlay();
        }
    };

    onDrag = (offset) => {
        const { endTime } = this.props;

        const p = (offset.x - BOUNDRY) / this.progressRef.current.offsetWidth;
        const time = Math.max(Math.round(p * endTime), 0);
        deboucneJump(time);
        this.hideTimeTooltip();
        if (this.props.playing) {
            this.wasPlaying = true;
            this.props.pause();
        }
    };

    showTimeTooltip = (e) => {
        if (e.target !== this.progressRef.current && e.target !== this.timelineRef.current) {
            return this.props.tooltipVisible && this.hideTimeTooltip();
        }
        const time = this.getTime(e);
        const { endTime, liveTimeTravel } = this.props;

        const timeLineTooltip = {
            time: liveTimeTravel ? endTime - time : time,
            offset: e.nativeEvent.offsetX,
            isVisible: true,
        };
        debounceTooltipChange(timeLineTooltip);
    };

    hideTimeTooltip = () => {
        const timeLineTooltip = { isVisible: false };
        debounceTooltipChange(timeLineTooltip);
    };

    render() {
        const {
            events,
            skip,
            skipIntervals,
            disabled,
            endTime,
            exceptionsList,
            resourceList,
            clickRageTime,
            stackList,
            fetchList,
            issues,
            liveTimeTravel,
        } = this.props;

        const scale = 100 / endTime;

        return (
            <div className="flex items-center absolute w-full" style={{ top: '-4px', zIndex: 100, padding: `0 ${BOUNDRY}px`, maxWidth: '100%' }}>
                <div
                    className={stl.progress}
                    onClick={disabled ? null : this.seekProgress}
                    ref={this.progressRef}
                    role="button"
                    onMouseMoveCapture={this.showTimeTooltip}
                    onMouseEnter={this.showTimeTooltip}
                    onMouseLeave={this.hideTimeTooltip}
                >
                    <TooltipContainer liveTimeTravel={liveTimeTravel} />
                    {/* custo color is live */}
                    <DraggableCircle left={this.props.time * scale} onDrop={this.onDragEnd} live={this.props.live} />
                    <CustomDragLayer
                        onDrag={this.onDrag}
                        minX={BOUNDRY}
                        maxX={this.progressRef.current && this.progressRef.current.offsetWidth + BOUNDRY}
                    />
                    <TimeTracker scale={scale}  />

                    {skip &&
                        skipIntervals.map((interval) => (
                            <div
                                key={interval.start}
                                className={stl.skipInterval}
                                style={{
                                    left: `${getTimelinePosition(interval.start, scale)}%`,
                                    width: `${(interval.end - interval.start) * scale}%`,
                                }}
                            />
                        ))}
                    <div className={stl.timeline} ref={this.timelineRef} />

                    {events.map((e) => (
                        <div key={e.key} className={stl.event} style={{ left: `${getTimelinePosition(e.time, scale)}%` }} />
                    ))}
                    {/* {issues.map((iss) => (
                        <div
                            style={{
                                left: `${getTimelinePosition(iss.time, scale)}%`,
                                top: '0px',
                                zIndex: 11,
                                width: 16,
                                height: 16,
                            }}
                            key={iss.key}
                            className={stl.clickRage}
                            onClick={this.createEventClickHandler(iss)}
                        >
                            <Tooltip
                                delay={0}
                                position="top"
                                html={
                                    <div className={stl.popup}>
                                        <b>{iss.name}</b>
                                    </div>
                                }
                            >
                                <Icon className="rounded-full bg-white" name={iss.icon} size="16" />
                            </Tooltip>
                        </div>
                    ))}
                    {events
                        .filter((e) => e.type === TYPES.CLICKRAGE)
                        .map((e) => (
                            <div
                                style={{
                                    left: `${getTimelinePosition(e.time, scale)}%`,
                                    top: '0px',
                                    zIndex: 11,
                                    width: 16,
                                    height: 16,
                                }}
                                key={e.key}
                                className={stl.clickRage}
                                onClick={this.createEventClickHandler(e)}
                            >
                                <Tooltip
                                    delay={0}
                                    position="top"
                                    html={
                                        <div className={stl.popup}>
                                            <b>{'Click Rage'}</b>
                                        </div>
                                    }
                                >
                                    <Icon className="bg-white" name={getPointerIcon('click_rage')} color="red" size="16" />
                                </Tooltip>
                            </div>
                        ))}
                    {typeof clickRageTime === 'number' && (
                        <div
                            style={{
                                left: `${getTimelinePosition(clickRageTime, scale)}%`,
                                top: '-0px',
                                zIndex: 11,
                                width: 16,
                                height: 16,
                            }}
                            className={stl.clickRage}
                        >
                            <Tooltip
                                delay={0}
                                position="top"
                                html={
                                    <div className={stl.popup}>
                                        <b>{'Click Rage'}</b>
                                    </div>
                                }
                            >
                                <Icon className="rounded-full bg-white" name={getPointerIcon('click_rage')} color="red" size="16" />
                            </Tooltip>
                        </div>
                    )}
                    {exceptionsList.map((e) => (
                        <div
                            key={e.key}
                            className={cn(stl.markup, stl.error)}
                            style={{ left: `${getTimelinePosition(e.time, scale)}%`, top: '0px', zIndex: 10, width: 16, height: 16 }}
                            onClick={this.createEventClickHandler(e)}
                        >
                            <Tooltip
                                delay={0}
                                position="top"
                                html={
                                    <div className={stl.popup}>
                                        <b>{'Exception'}</b>
                                        <br />
                                        <span>{e.message}</span>
                                    </div>
                                }
                            >
                                <Icon className=" rounded-full bg-white" name={getPointerIcon('exception')} color="red" size="16" />
                            </Tooltip>
                        </div>
                    ))}
                    {resourceList
                        .filter((r) => r.isRed() || r.isYellow())
                        .map((r) => (
                            <div
                                key={r.key}
                                className={cn(stl.markup, {
                                    [stl.error]: r.isRed(),
                                    [stl.warning]: r.isYellow(),
                                })}
                                style={{ left: `${getTimelinePosition(r.time, scale)}%`, top: '0px', zIndex: 10, width: 16, height: 16 }}
                                onClick={this.createEventClickHandler(r)}
                            >
                                <Tooltip
                                    delay={0}
                                    position="top"
                                    html={
                                        <div className={stl.popup}>
                                            <b>{r.success ? 'Slow resource: ' : 'Missing resource:'}</b>
                                            <br />
                                            {r.name}
                                        </div>
                                    }
                                >
                                    <Icon className=" rounded-full bg-white" name={getPointerIcon('resource')} size="16" />
                                </Tooltip>
                            </div>
                        ))}
                    {fetchList
                        .filter((e) => e.isRed())
                        .map((e) => (
                            <div
                                key={e.key}
                                className={cn(stl.markup, stl.error)}
                                style={{ left: `${getTimelinePosition(e.time, scale)}%`, top: '0px' }}
                                onClick={this.createEventClickHandler(e)}
                            >
                                <Tooltip
                                    delay={0}
                                    position="top"
                                    html={
                                        <div className={stl.popup}>
                                            <b>Failed Fetch</b>
                                            <br />
                                            {e.name}
                                        </div>
                                    }
                                >
                                    <Icon className=" rounded-full bg-white" name={getPointerIcon('fetch')} color="red" size="16" />
                                </Tooltip>
                            </div>
                        ))}
                    {stackList
                        .filter((e) => e.isRed())
                        .map((e) => (
                            <div
                                key={e.key}
                                className={cn(stl.markup, stl.error)}
                                style={{ left: `${getTimelinePosition(e.time, scale)}%`, top: '0px' }}
                                onClick={this.createEventClickHandler(e)}
                            >
                                <Tooltip
                                    delay={0}
                                    position="top"
                                    html={
                                        <div className={stl.popup}>
                                            <b>Stack Event</b>
                                            <br />
                                            {e.name}
                                        </div>
                                    }
                                >
                                    <Icon className=" rounded-full bg-white" name={getPointerIcon('stack')} size="16" />
                                </Tooltip>
                            </div>
                        ))} */}
                </div>
            </div>
        );
    }
}
