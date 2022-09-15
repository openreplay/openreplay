import React, { useState, useEffect } from 'react'
import { convertTimestampToUtcTimestamp } from 'App/date';

interface Props {
  startTime: any,
  className?: string
}

function Counter({ startTime, className }: Props) {
  let intervalId: NodeJS.Timer;
  const [duration, setDuration] = useState(convertTimestampToUtcTimestamp(new Date().getTime()) - convertTimestampToUtcTimestamp(startTime));

  const secsFull = ~~(duration / 1000)
  const mins = ~~(secsFull / 60)
  const secs = secsFull - mins * 60
  const formattedDuration = `${mins}:${secs < 10 ? 0 : ''}${secs}`

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
