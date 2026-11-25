import { PixelSpark } from './PixelArt';
import './ai.css';

export function AiTag({
  size = 'sm',
  className,
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <span
      className={`m-aitag m-aitag--${size}${className ? ` ${className}` : ''}`}
    >
      <PixelSpark className="m-aitag__spark" />
      AI
    </span>
  );
}
