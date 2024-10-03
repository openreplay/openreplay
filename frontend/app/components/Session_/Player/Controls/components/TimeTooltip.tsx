import React from 'react';
import { observer } from 'mobx-react-lite';
import { useStore } from 'App/mstore';
import stl from './styles.module.css';

function TimeTooltip() {
  const { sessionStore } = useStore();
  const timeLineTooltip = sessionStore.timeLineTooltip;
  const { time = 0, offset = 0, isVisible, localTime, userTime } = timeLineTooltip;
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

export default observer(TimeTooltip);
