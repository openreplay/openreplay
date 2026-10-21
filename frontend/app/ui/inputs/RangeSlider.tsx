import type { CSSProperties } from 'react';

import './range-slider.css';

export interface RangeSliderProps {
  /** the index of the chosen stop */
  value: number;
  /** how many stops the track has: a scale that is not linear still travels evenly */
  stops: number;
  onChange: (index: number) => void;
  /** what is being chosen ("Sessions a month") */
  label: string;
  /** what a screen reader says for the current stop ("50,000 sessions") */
  valueText?: string;
}

/** A native range input in the kit's dress, moving stop to stop. */
export function RangeSlider({
  value,
  stops,
  onChange,
  label,
  valueText,
}: RangeSliderProps) {
  const fill = stops > 1 ? (value / (stops - 1)) * 100 : 0;
  return (
    <input
      type="range"
      className="m-range"
      min={0}
      max={stops - 1}
      step={1}
      value={value}
      aria-label={label}
      aria-valuetext={valueText}
      style={{ '--m-range-fill': `${fill}%` } as CSSProperties}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}
