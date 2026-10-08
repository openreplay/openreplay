import { cn } from '@/lib/utils';
import { useViewportFit } from '@/ui/overlays/use-viewport-fit';
import * as D from '@radix-ui/react-dropdown-menu';
import type { ComponentProps } from 'react';

export const DropdownMenu = D.Root;
export const DropdownMenuTrigger = D.Trigger;

export function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 6,
  ref,
  ...props
}: ComponentProps<typeof D.Content>) {
  const fitRef = useViewportFit(ref);
  return (
    <D.Portal>
      <D.Content
        ref={fitRef}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'm-pop z-[var(--m-z-dropdown)] min-w-40 rounded-surface border border-border-default bg-surface-raised',
          'm-elevated p-3 outline-none',
          className,
        )}
        {...props}
      />
    </D.Portal>
  );
}

export function DropdownMenuItem({
  className,
  danger,
  ...props
}: ComponentProps<typeof D.Item> & { danger?: boolean }) {
  return (
    <D.Item
      className={cn(
        'flex h-[var(--m-control-height-md)] cursor-pointer select-none items-center gap-4 rounded-control px-5 text-sm outline-none',

        'm-hover',
        'text-content-secondary data-[highlighted]:bg-surface-hover data-[highlighted]:text-content-primary',

        'data-[disabled]:cursor-not-allowed data-[disabled]:text-content-disabled data-[disabled]:hover:bg-transparent',
        danger && 'text-content-danger data-[highlighted]:text-content-danger',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof D.Separator>) {
  return (
    <D.Separator
      className={cn('my-1 h-px bg-border-subtle', className)}
      {...props}
    />
  );
}

export interface MenuItem {
  key: string;
  type?: 'divider';
  label?: React.ReactNode;
  icon?: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function DropdownMenuItems({ items }: { items: readonly MenuItem[] }) {
  return (
    <>
      {items.map((i) =>
        i.type === 'divider' ? (
          <DropdownMenuSeparator key={i.key} />
        ) : (
          <DropdownMenuItem
            key={i.key}
            danger={i.danger}
            disabled={i.disabled}
            onSelect={() => i.onClick?.()}
          >
            {i.icon}
            {i.label}
          </DropdownMenuItem>
        ),
      )}
    </>
  );
}
