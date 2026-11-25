import React, { useEffect, useState } from 'react';

import { formatClock } from 'App/player-ui/clock';

/** Live elapsed counter for an in-flight run. */
export function LiveDuration({
  start,
  className,
  format = formatClock,
}: {
  start: number;
  className?: string;
  /** matches how the finished runs beside it read */
  format?: (ms: number) => string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className={className}>{format(Math.max(0, now - start))}</span>;
}
