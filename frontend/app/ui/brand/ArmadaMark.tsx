import './armada-mark.css';

export interface ArmadaMarkProps {
  size?: number;
  className?: string;
}

/** Armada's glyph: a small robot on lucide's grid, in the row's own ink. */
export function ArmadaMark({ size = 15, className }: ArmadaMarkProps) {
  return (
    <span
      className={`m-armada${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="m-armada__svg" fill="none">
        <path d="M12 7.5 13.4 4" className="m-armada__line" />
        <circle cx="13.9" cy="2.9" r="1.35" className="m-armada__dot" />
        <rect
          x="3.5"
          y="7.5"
          width="17"
          height="13"
          rx="5.5"
          className="m-armada__line"
        />
        <path d="M1.5 12.5v3M22.5 12.5v3" className="m-armada__line" />
        <g className="m-armada__eyes">
          <circle cx="9" cy="13" r="1.45" className="m-armada__dot" />
          <circle cx="15" cy="13" r="1.45" className="m-armada__dot" />
        </g>
        <path
          d="M9.6 16.6c1.4 1 3.4 1 4.8 0"
          className="m-armada__line m-armada__smile"
        />
      </svg>
    </span>
  );
}
