import React from 'react';
// @ts-ignore
import { Duration } from 'luxon';
import { connect } from 'react-redux';
import stl from './styles.module.css';

interface Props {
  time: number;
  offset: number;
  isVisible: boolean;
}

function TimeTooltip({
  time,
  offset,
  isVisible,
}: Props) {
  return (
    <div
      className={stl.timeTooltip}
      style={{
        top: -30,
        left: offset,
        display: isVisible ? 'block' : 'none',
        transform: 'translateX(-50%)',
        whiteSpace: 'nowrap',
      }}
    >
      {!time ? 'Loading' : time}
    </div>
  );
}

export default connect((state) => {
  const { time = 0, offset = 0, isVisible } = state.getIn(['sessions', 'timeLineTooltip']);
  return { time, offset, isVisible };
})(TimeTooltip);
