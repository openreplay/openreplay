import { type LucideIcon, MousePointerClick, Tag, Zap } from 'lucide-react';

export type CaptureKind = 'auto' | 'custom' | 'click';

const ICON: Record<CaptureKind, LucideIcon> = {
  auto: Zap,
  custom: Tag,
  click: MousePointerClick,
};

const CLICKS = new Set([
  'click',
  'clickrage',
  'rageclick',
  'deadclick',
  'taprage',
]);

/** Where an event came from; with `clicks`, a click event keeps the pointer. */
export function captureKind(
  name: string,
  autoCaptured: boolean,
  clicks = false,
): CaptureKind {
  if (
    clicks &&
    autoCaptured &&
    CLICKS.has(name.toLowerCase().replace(/[\s_-]/g, ''))
  )
    return 'click';
  return autoCaptured ? 'auto' : 'custom';
}

export function CaptureIcon({
  kind,
  size = 13,
  className,
}: {
  kind: CaptureKind;
  size?: number;
  className?: string;
}) {
  const Glyph = ICON[kind];
  return <Glyph size={size} aria-hidden="true" className={className} />;
}
