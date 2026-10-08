import { ImpactMeter } from '@/ui/data/ImpactMeter';
import React from 'react';

import { impactLevel } from './model';

/** Three bars, filled by impact level. */
export default function ImpactGauge({
  value,
  label,
}: {
  value: number;
  label?: boolean;
}) {
  return <ImpactMeter level={impactLevel(value)} compact={!label} />;
}
