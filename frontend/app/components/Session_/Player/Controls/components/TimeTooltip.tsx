import React from 'react';
// @ts-ignore
import { Duration } from 'luxon';
import { connect } from 'react-redux';
import stl from './styles.module.css';

interface Props {
  time: number;
  offset: number;
  isVisible: boolean;
  timeStr: string;
}

function TimeTooltip({
  time,
  offset,
  isVisible,
  timeStr,
}: Props) {
  return (
    <div
      className={stl.timeTooltip}
      style={{
        top: 0,
        left: `calc(${offset}px - 0.5rem)`,
        display: isVisible ? 'block' : 'none',
        transform: 'translate(-50%, -110%)',
        whiteSpace: 'nowrap',
        textAlign: "center",
      }}
    >
      {!time ? 'Loading' : time}
      {timeStr ? (
        <>
          <br />
          <span className="text-gray-light">({timeStr})</span>
        </>
      ) : null}
    </div>
  );
}

export default connect((state) => {
  const { time = 0, offset = 0, isVisible, timeStr } = state.getIn(['sessions', 'timeLineTooltip']);
  return { time, offset, isVisible, timeStr };
})(TimeTooltip);
