import { BROWSER_GLYPHS } from './browser-glyphs';

export interface BrowserIconProps {
  name: string;
  size?: number;
  className?: string;
}

export function browserGlyphOf(name: string): keyof typeof BROWSER_GLYPHS {
  const n = name.toLowerCase();
  if (n.includes('chrome') || n.includes('chromium')) return 'chrome';
  if (n.includes('firefox')) return 'firefox';
  if (n.includes('safari')) return 'safari';
  if (n.includes('edge')) return 'edge';
  if (n.includes('opera')) return 'opera';
  return 'browser';
}

export function BrowserIcon({ name, size = 15, className }: BrowserIconProps) {
  const g = BROWSER_GLYPHS[browserGlyphOf(name)]!;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={g.viewBox}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={g.d} />
    </svg>
  );
}
