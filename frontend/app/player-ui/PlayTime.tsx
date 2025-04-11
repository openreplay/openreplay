import React from 'react';
import { Duration } from 'luxon';
import { getTimeFromMill } from 'App/date';

const styles = {
  padding: '0 12px',
  width: '70px',
  'text-align': 'center',
};

interface IProps {
  /** current time in ms */
  time: number;
  isCustom?: boolean;
  format?: string;
}

/** Play time timer */
export function PlayTime({ time, isCustom, format = 'm:ss' }: IProps) {
  return (
    <div
      style={!isCustom ? styles : undefined}
      className={!isCustom ? 'color-gray-medium' : undefined}
    >
      {Duration.fromMillis(time).toFormat(format)}
    </div>
  );
}

/** Displays current time during replay */
export function RealPlayTime({
  time,
  sessionStart,
  tz,
}: {
  time: number;
  sessionStart: number;
  tz: string;
}) {
  return <div>{getTimeFromMill(time + sessionStart, tz)}</div>;
}

PlayTime.displayName = 'PlayTime';
