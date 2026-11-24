import { useEffect, useState } from 'react';

/** `value`, once it has stopped changing for `ms` */
export default function useDebouncedValue<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setSettled(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return settled;
}
