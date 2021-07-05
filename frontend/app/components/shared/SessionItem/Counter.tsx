import React, { useState, useEffect } from 'react'
import { Duration } from 'luxon';

interface Props {
  startTime: any
}

function Counter({ startTime }: Props) {
  let intervalId;
  const [duration, setDuration] = useState(new Date().getTime() - startTime)

  useEffect(() => {
    if (!intervalId) {
      intervalId = setInterval(() => {
        setDuration(duration + 1000)
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [duration])

  return (
    <div className="mx-2">
      {startTime && Duration.fromMillis(duration).toFormat('m:ss')}
    </div>
  )
}

export default Counter
