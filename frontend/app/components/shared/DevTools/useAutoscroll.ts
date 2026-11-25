import { Timed } from 'Player';
import { useEffect, useMemo, useState } from 'react';

import useCancelableTimeout from 'App/hooks/useCancelableTimeout';
import useLatestRef from 'App/hooks/useLatestRef';
import { lastIndexAtOrBefore } from 'App/utils/timeIndex';

const TIMEOUT_DURATION = 5000;

export function getLastItemTime(...lists: Timed[][]) {
  return Math.max(...lists.map((l) => (l.length ? l[l.length - 1].time : 0)));
}

function useAutoupdate<T>(
  savedValue: T,
  actualValue: T,
  resetValue: T,
  updadteValue: (value: T) => void,
) {
  const [autoupdate, setAutoupdate] = useState(savedValue === resetValue);

  const [timeoutStartAutoupdate, stopAutoupdate] = useCancelableTimeout(
    () => setAutoupdate(true),
    () => setAutoupdate(false),
    TIMEOUT_DURATION,
  );
  useEffect(() => {
    if (autoupdate && actualValue !== savedValue) {
      updadteValue(actualValue);
    }
  }, [autoupdate, actualValue]);

  const autoScrollRef = useLatestRef(autoupdate);
  useEffect(() => {
    if (!autoupdate) {
      timeoutStartAutoupdate();
    }
    return () => {
      if (autoScrollRef.current) {
        updadteValue(resetValue);
      }
    };
  }, []);

  return [timeoutStartAutoupdate, stopAutoupdate];
}

// That might be simplified by removing index from devTools[INDEX_KEY] store...
export default function useAutoscroll(
  filteredList: Timed[],
  time: number,
  savedIndex: number,
  updadteIndex: (index: number) => void,
) {
  const filteredIndexNow = useMemo(() => {
    const i = lastIndexAtOrBefore(filteredList, time);
    // past the end once every item is behind `time`
    return i === filteredList.length - 1 ? filteredList.length : i;
  }, [time, filteredList]);

  return useAutoupdate(savedIndex, filteredIndexNow, 0, updadteIndex);
}
