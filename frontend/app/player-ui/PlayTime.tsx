import React from 'react';
import { Duration } from 'luxon';
import { getTimeFromMill } from 'App/date';

interface IProps {
  /** current time in ms */
  time: number;
  format?: string;
}

/** Play time timer */
export function PlayTime({ time, format = 'm:ss' }: IProps) {
  return <div>{Duration.fromMillis(time).toFormat(format)}</div>;
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
