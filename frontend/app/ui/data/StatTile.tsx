import type { ReactNode } from 'react';

import './stat-tile.css';

export interface StatTileProps {
  value: ReactNode;
  label: ReactNode;

  tone?: 'neutral' | 'accent';
}

export function StatTile({ value, label, tone = 'neutral' }: StatTileProps) {
  return (
    <div className={`m-tile m-tile--${tone}`}>
      <span className="m-tile__value">{value}</span>
      <span className="m-tile__label">{label}</span>
    </div>
  );
}
