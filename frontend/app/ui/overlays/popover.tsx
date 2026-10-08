import { cn } from '@/lib/utils';
import * as P from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';

import { useViewportFit } from './use-viewport-fit';

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;

export function PopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  ref,
  ...props
}: ComponentProps<typeof P.Content>) {
  const fitRef = useViewportFit(ref);
  return (
    <P.Portal>
      <P.Content
        ref={fitRef}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'm-pop z-[var(--m-z-dropdown)] rounded-surface border border-border-subtle bg-surface-raised',
          'm-elevated outline-none',
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}

const PLACEMENT = {
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  topLeft: { side: 'top', align: 'start' },
  top: { side: 'top', align: 'center' },
  topRight: { side: 'top', align: 'end' },
  rightTop: { side: 'right', align: 'start' },
  right: { side: 'right', align: 'center' },
  rightBottom: { side: 'right', align: 'end' },
  leftTop: { side: 'left', align: 'start' },
  left: { side: 'left', align: 'center' },
  leftBottom: { side: 'left', align: 'end' },
} as const;

export type Placement = keyof typeof PLACEMENT;

export function PopoverPanel({
  open,
  onOpenChange,
  content,
  placement = 'bottomLeft',
  sideOffset = 6,
  className,
  children,
  ref,
  ...rest
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  content: React.ReactNode;
  placement?: Placement;
  sideOffset?: number;
  className?: string;
  children: React.ReactNode;
} & Omit<
  ComponentProps<typeof P.Content>,
  'content' | 'children' | 'className' | 'align' | 'side'
>) {
  const p = PLACEMENT[placement];
  const fitRef = useViewportFit(ref);
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{children}</P.Trigger>
      <P.Portal>
        <P.Content
          ref={fitRef}
          side={p.side}
          align={p.align}
          sideOffset={sideOffset}
          className={cn(
            'm-pop z-[var(--m-z-dropdown)] rounded-surface border border-border-subtle bg-surface-raised',
            'm-elevated outline-none',
            className,
          )}
          {...rest}
        >
          {content}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
