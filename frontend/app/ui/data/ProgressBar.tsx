import './progress-bar.css';

export interface ProgressBarProps {
  value: number;

  label: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span
      className="m-bar"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <span className="m-bar__fill" style={{ width: `${pct}%` }} />
    </span>
  );
}
