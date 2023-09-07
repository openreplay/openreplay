import React from 'react';
import { connect } from 'react-redux';
import stl from './styles.module.css';

interface Props {
  time: number;
  offset: number;
  isVisible: boolean;
  localTime: string;
  userTime?: string;
}

function TimeTooltip({
  time,
  offset,
  isVisible,
  localTime,
  userTime
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
      {localTime ? (
        <>
          <br />
          <span className="text-gray-light">local: {localTime}</span>
        </>
      ) : null}
      {userTime ? (
        <>
          <br />
          <span className="text-gray-light">user: {userTime}</span>
        </>
      ) : null}
    </div>
  );
}

export default connect((state) => {
  // @ts-ignore
  const { time = 0, offset = 0, isVisible, localTime, userTime } = state.getIn(['sessions', 'timeLineTooltip']);
  return { time, offset, isVisible, localTime, userTime };
})(TimeTooltip);
