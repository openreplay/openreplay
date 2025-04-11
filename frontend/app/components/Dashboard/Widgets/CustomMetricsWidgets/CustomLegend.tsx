import React from 'react';
import { Legend } from 'recharts';

interface CustomLegendProps {
  payload?: any[];
}

function CustomLegend({ payload }: CustomLegendProps) {
  return (
    <div
      className="custom-legend"
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      {payload?.map((entry) => (
        <div
          key={entry.value}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {entry.value.includes('(Comparison)') ? (
            <div
              style={{
                width: 20,
                height: 2,
                backgroundImage:
                  'linear-gradient(to right, black 50%, transparent 50%)',
                backgroundSize: '4px 2px',
                backgroundRepeat: 'repeat-x',
              }}
            />
          ) : (
            <div
              style={{
                width: 20,
                height: 2,
                backgroundColor: entry.color,
              }}
            />
          )}
          <span className="text-sm">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export default CustomLegend;
