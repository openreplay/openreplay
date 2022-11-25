import { useRef, useEffect } from 'react'


export default function useLatestRef<T>(state: T) {
  const ref = useRef<T>(state)
  useEffect(() => { ref.current = state }, [ state ])
  return ref
}