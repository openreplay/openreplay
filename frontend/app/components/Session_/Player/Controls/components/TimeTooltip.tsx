import React from 'react';
// @ts-ignore
import { Duration } from 'luxon';
import { connect } from 'react-redux';
import stl from './styles.module.css';

interface Props {
  time: number;
  offset: number;
  isVisible: boolean;
  liveTimeTravel: boolean;
}

function TimeTooltip({
  time,
  offset,
  isVisible,
  liveTimeTravel,
}: Props) {
  const duration = Duration.fromMillis(time).toFormat(`${liveTimeTravel ? '-' : ''}mm:ss`);
  return (
    <div
      className={stl.timeTooltip}
      style={{
        top: -30,
        left: offset - 20,
        display: isVisible ? 'block' : 'none',
      }}
    >
      {!time ? 'Loading' : duration}
    </div>
  );
}

export default connect((state) => {
  const { time = 0, offset = 0, isVisible } = state.getIn(['sessions', 'timeLineTooltip']);
  return { time, offset, isVisible };
})(TimeTooltip);
