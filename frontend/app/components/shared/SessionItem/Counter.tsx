import React, { useState, useEffect } from 'react'
import { Duration } from 'luxon';
import { durationFormatted, formatTimeOrDate } from 'App/date';

interface Props {
  startTime: any
}

function Counter({ startTime }: Props) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setInterval(function() {
      setCount(count + 1000)
    }, 1000)
  }, [])

  return (
    <div className="mx-2">
      {startTime && Duration.fromMillis(startTime + count).toFormat('m:ss')}
    </div>
  )
}

export default Counter
