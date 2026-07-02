import React from 'react';

import { IMPACT_COLOR, IMPACT_FILLED, impactLevel } from './model';

/* Impact as a horizontal three-level connected meter — one rounded pill split
   into three parts, lit by level. Shared by the list and the detail header. */
export default function ImpactGauge({ value }: { value: number }) {
  const filled = IMPACT_FILLED[impactLevel(value)];
  const color = IMPACT_COLOR[impactLevel(value)];
  return (
    <span
      className="inline-flex bg-white overflow-hidden"
      style={{ width: 38, height: 3, borderRadius: 2, gap: 1 }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            flex: 1,
            background: i < filled ? color : 'var(--color-gray-light)',
          }}
        />
      ))}
    </span>
  );
}
