import { useEffect, useState, useMemo } from 'react'
import { Timed } from 'Player'
import useLatestRef from 'App/hooks/useLatestRef'
import useCancelableTimeout from 'App/hooks/useCancelableTimeout'

const TIMEOUT_DURATION = 5000;

export function getLastItemTime(...lists: Timed[][]) {
  return Math.max(...lists.map(l => l.length ? l[l.length-1].time : 0))
}

function useAutoupdate<T>(
  savedValue: T,
  actualValue: T,
  resetValue: T,
  updadteValue: (value: T) => void,
) {
  const [ autoupdate, setAutoupdate ] = useState(savedValue === resetValue)
  
  const [ timeoutStartAutoupdate, stopAutoupdate ] = useCancelableTimeout(
    () => setAutoupdate(true), 
    () => setAutoupdate(false),
    TIMEOUT_DURATION,
  )
  useEffect(() => {
    if (autoupdate && actualValue !== savedValue) {
      updadteValue(actualValue)
    }
  }, [ autoupdate, actualValue ])

  const autoScrollRef = useLatestRef(autoupdate)
  useEffect(() => {
    if (!autoupdate) {
      timeoutStartAutoupdate()
    }
    return () => {
      if (autoScrollRef.current) {
        updadteValue(resetValue)
      }
    }
  }, [])

  return [ timeoutStartAutoupdate, stopAutoupdate ]
}

// That might be simplified by removing index from devTools[INDEX_KEY] store...
export default function useAutoscroll(
  filteredList: Timed[],
  time: number,
  savedIndex: number,
  updadteIndex: (index: number) => void,
) {
  const filteredIndexNow = useMemo(() => {
    // Should use findLastIndex here
    for (let i=0; i < filteredList.length; i++) {
      if (filteredList[i].time > time) {
        return i-1
      }
    }
    return filteredList.length
  }, [ time, filteredList ])

  return useAutoupdate(savedIndex, filteredIndexNow, 0, updadteIndex)
}