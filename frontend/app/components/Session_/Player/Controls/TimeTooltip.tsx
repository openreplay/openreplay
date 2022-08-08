import React from 'react';
import { Duration } from 'luxon';
import { connect } from 'react-redux';
import stl from './timeline.module.css';

function TimeTooltip({ time, offset, isVisible }: { time: number; offset: number; isVisible: boolean }) {
    const duration = Duration.fromMillis(time).toFormat('mm:ss');
    return (
        <div
            className={stl.timeTooltip}
            style={{ 
              top: -30, 
              left: offset - 20, 
              display: isVisible ? 'block' : 'none' }
            }
        >
            {duration}
        </div>
    );
}

export default connect((state) => {
    const { time = 0, offset = 0, isVisible } = state.getIn(['sessions', 'timeLineTooltip']);
    return { time, offset, isVisible };
})(TimeTooltip);
