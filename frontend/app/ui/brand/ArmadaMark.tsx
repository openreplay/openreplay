import './armada-mark.css';

export interface ArmadaMarkProps {
  size?: number;

  glow?: boolean;
  className?: string;
}

export function ArmadaMark({
  size = 15,
  glow = true,
  className,
}: ArmadaMarkProps) {
  return (
    <span
      className={`m-armada${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {glow && <span className="m-armada__glow" />}
      <svg viewBox="0 0 24 24" className="m-armada__svg" fill="none">
        <path d="M3.4 10.2 12 2.6l8.6 7.6" className="m-armada__lead" />
        <path d="M4.6 15.6 12 9.1l7.4 6.5" className="m-armada__wing" />
        <path d="M5.8 21 12 15.6l6.2 5.4" className="m-armada__tail" />
      </svg>
    </span>
  );
}
