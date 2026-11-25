import {
  Gauge,
  Globe,
  type LucideIcon,
  MousePointerClick,
  Repeat,
  Route,
  Zap,
} from 'lucide-react';

import type { ChapterKey } from './model';

/** One glyph per chapter: New audit's Sections, the report's contents and eyebrows. */
export const SECTION_ICONS: Record<ChapterKey, LucideIcon> = {
  web: Globe,
  usage: MousePointerClick,
  errors: Gauge,
  retention: Repeat,
  ux: Zap,
  journeys: Route,
};

export function SectionIcon({
  section,
  size = 14,
  className,
}: {
  section: ChapterKey;
  size?: number;
  className?: string;
}) {
  const Icon = SECTION_ICONS[section];
  return (
    <Icon
      size={size}
      strokeWidth={1.75}
      className={className}
      aria-hidden="true"
    />
  );
}
