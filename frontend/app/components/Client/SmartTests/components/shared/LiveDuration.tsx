import React, { useEffect, useState } from 'react';

import { formatClock } from 'App/player-ui/clock';

/** Live elapsed counter for an in-flight run. */
export function LiveDuration({
  start,
  className,
}: {
  start: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className={className}>{formatClock(now - start)}</span>;
}
