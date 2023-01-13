import React from 'react'
import { Duration } from 'luxon';

const styles = {
  padding: '0 12px',
  width: '70px',
  'text-align': 'center',
}

interface IProps {
  /** current time in ms */
  time: number;
  isCustom?: boolean;
  format?: string;
}

/** Play time timer */
export const PlayTime = ({ time, isCustom, format = 'm:ss', }: IProps) => (
  <div
    style={!isCustom ? styles : undefined}
    className={!isCustom ? 'color-gray-medium' : undefined}
  >
    {Duration.fromMillis(time).toFormat(format)}
  </div>
)

PlayTime.displayName = "PlayTime";