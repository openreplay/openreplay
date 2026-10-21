import React from 'react';

import { millisToMinutesAndSeconds } from 'App/utils';

const TICKS = 8;

function TimelineScale({ endTime }: { endTime: number }) {
  return (
    <div className="m-dt__lane m-dt__lane--axis" aria-hidden="true">
      <span className="m-dt__lane-title" />
      <div className="m-dt__lane-track m-dt__axis">
        {Array.from({ length: TICKS }, (_, i) => {
          const at = (endTime / TICKS) * (i + 0.5);
          return (
            <i key={i} style={{ left: `${((i + 0.5) / TICKS) * 100}%` }}>
              {millisToMinutesAndSeconds(at)}
            </i>
          );
        })}
      </div>
    </div>
  );
}

export default TimelineScale;
