import { useEffect, useState, useRef } from 'react'
import useLatestRef from 'App/hooks/useLatestRef'
import useCancelableTimeout from 'App/hooks/useCancelableTimeout'

const TIMEOUT_DURATION = 5000;

export default function useAutoscroll(
  savedIndex: number,
  autoscrollIndex: number,
  updadteIndex: (index: number) => void,
) {
  const [ autoscroll, setAutoscroll ] = useState(savedIndex === 0)
  
  const [ timeoutStartAutoscroll, stopAutoscroll ] = useCancelableTimeout(
    () => setAutoscroll(true), 
    () => setAutoscroll(false),
    TIMEOUT_DURATION,
  )
  useEffect(() => {
    if (autoscroll && autoscrollIndex !== savedIndex) {
      updadteIndex(autoscrollIndex)
    }
  }, [ autoscroll, autoscrollIndex ])

  const autoScrollRef = useLatestRef(autoscroll)
  useEffect(() => {
    if (!autoscroll) {
      timeoutStartAutoscroll()
    }
    return () => {
      if (autoScrollRef.current) {
        updadteIndex(0) // index:0 means autoscroll is active
      }
    }
  }, [])

  return {
    autoscrollIndex,
    timeoutStartAutoscroll,
    stopAutoscroll,
  }

}