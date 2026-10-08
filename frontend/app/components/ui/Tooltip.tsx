import { Tooltip as KitTooltip } from '@/ui/overlays/tooltip';
import React from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface Props {
  title?: React.ReactNode;
  children: React.ReactNode;
  /** antd-style placement; only its side is kept */
  placement?: string;
  delay?: number;
  /** seconds, antd-style */
  mouseEnterDelay?: number;
  disabled?: boolean;
  [x: string]: any;
}

const sideOf = (placement?: string): Side =>
  (['top', 'bottom', 'left', 'right'] as const).find((s) =>
    placement?.startsWith(s),
  ) ?? 'top';

/** Legacy entry point; the kit tooltip underneath. */
export default function Tooltip({
  title,
  children,
  placement,
  delay,
  mouseEnterDelay,
  disabled,
}: Props) {
  return (
    <KitTooltip
      title={disabled ? null : title}
      side={sideOf(placement)}
      delay={delay ?? (mouseEnterDelay != null ? mouseEnterDelay * 1000 : 200)}
    >
      {children}
    </KitTooltip>
  );
}
