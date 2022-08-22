import React from 'react';
// @ts-ignore
import { Duration } from 'luxon';
import { connect } from 'react-redux';
// @ts-ignore
import stl from './timeline.module.css';

function TimeTooltip({ time, offset, isVisible, liveTimeTravel }: { time: number; offset: number; isVisible: boolean, liveTimeTravel: boolean }) {
    const duration = Duration.fromMillis(time).toFormat(`${liveTimeTravel ? '-' : ''}mm:ss`);
    return (
        <div
            className={stl.timeTooltip}
            style={{ 
              top: -30, 
              left: offset - 20, 
              display: isVisible ? 'block' : 'none' }
            }
        >
            {!time ? 'Loading' : duration}
        </div>
    );
}

export default connect((state) => {
    const { time = 0, offset = 0, isVisible } = state.getIn(['sessions', 'timeLineTooltip']);
    return { time, offset, isVisible };
})(TimeTooltip);
