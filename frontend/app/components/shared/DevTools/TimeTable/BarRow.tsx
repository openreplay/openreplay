import { percentOf } from 'App/utils';
import React from 'react';
import styles from './barRow.module.css';
import tableStyles from './timeTable.module.css';

const formatTime = (time) =>
  time < 1000 ? `${time.toFixed(2)}ms` : `${time / 1000}s`;

interface Props {
  resource: {
    time: number;
    ttfb?: number;
    duration?: number;
    key: string;
  };
  popup?: boolean;
  timestart: number;
  timewidth: number;
}

// TODO: If request has no duration, set duration to 0.2s. Enforce existence of duration in the future.
function BarRow({
  resource: { time, ttfb = 0, duration = 200, key },
  popup = false,
  timestart = 0,
  timewidth,
}: Props) {
  const timeOffset = time - timestart;
  ttfb = ttfb || 0;

  const trigger = (
    <div
      className={styles.barWrapper}
      style={{
        left: `${percentOf(timeOffset, timewidth)}%`,
        right: `${100 - percentOf(timeOffset + duration, timewidth)}%`,
        minWidth: '5px',
      }}
    >
      <div
        className={styles.ttfbBar}
        style={{
          width: `${percentOf(ttfb, duration)}%`,
        }}
      />
      <div
        className={styles.downloadBar}
        style={{
          width: `${percentOf(duration - ttfb, duration)}%`,
          minWidth: '5px',
        }}
      />
    </div>
  );
  if (!popup) {
    return (
      <div key={key} className={tableStyles.row}>
        {' '}
        {trigger}{' '}
      </div>
    );
  }

  return (
    <div key={key} className={tableStyles.row} style={{ height: '15px' }}>
      {trigger}
    </div>
  );
}

BarRow.displayName = 'BarRow';

export default React.memo(BarRow);
