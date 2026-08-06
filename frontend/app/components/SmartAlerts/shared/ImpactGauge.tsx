import React from 'react';

import { IMPACT_COLOR, IMPACT_FILLED, impactLevel } from './model';

/* Impact as a horizontal three-level meter. Shared by list and detail header. */
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
