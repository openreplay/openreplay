import React, { useState, useEffect } from 'react'
import { Duration } from 'luxon';
import { durationFormatted, convertTimestampToUtcTimestamp } from 'App/date';

interface Props {
  startTime: any,
  className?: string
}

function Counter({ startTime, className }: Props) {
  let intervalId: NodeJS.Timer;
  const [duration, setDuration] = useState(convertTimestampToUtcTimestamp(new Date().getTime()) - convertTimestampToUtcTimestamp(startTime));

  const formattedDuration = durationFormatted(Duration.fromMillis(duration));

  useEffect(() => {
    if (!intervalId) {
      intervalId = setInterval(() => {
        setDuration(duration + 1000)
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [duration])

  return (
    <div className={className}>
      {startTime && formattedDuration}
    </div>
  )
}

export default Counter
