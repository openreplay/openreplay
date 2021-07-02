import React from 'react'
import { Duration } from 'luxon';
import { durationFormatted, formatTimeOrDate } from 'App/date';

interface Props {
  startTime: any
}

function Counter({ startTime }: Props) {
  return (
    <div className="mx-2">
      {startTime && Duration.fromMillis(startTime).toFormat('m:ss')}
    </div>
  )
}

export default Counter
