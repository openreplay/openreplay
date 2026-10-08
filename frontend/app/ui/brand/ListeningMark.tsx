import './listening-mark.css';

export interface ListeningMarkProps {
  label: string;

  size?: number;
  className?: string;
}

export function ListeningMark({
  label,
  size = 18,
  className,
}: ListeningMarkProps) {
  return (
    <span
      className={`m-listen${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <span className="m-listen__glow" />
      <span className="m-listen__halo" />
      <span className="m-listen__dot" />
    </span>
  );
}
