import { cn } from '@/lib/utils';
import * as D from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;

  label: string;

  size?: DrawerSize;
  /** px; overrides `size` for content laid out at a fixed width */
  width?: number;
  /** which edge it slides from */
  side?: 'right' | 'left';
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
}

export type DrawerSize = 'form' | 'wide';

export function Drawer({
  open,
  onClose,
  label,
  size = 'form',
  width,
  side = 'right',
  header,
  footer,
  className,
  children,
}: DrawerProps) {
  return (
    <D.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <D.Portal>
        <D.Overlay
          data-slot="drawer-mask"
          className="m-scrim fixed inset-0 z-[var(--m-z-overlay)] bg-[var(--m-scrim)]"
        />
        <D.Content
          data-slot="drawer"
          data-side={side}
          style={{
            width: width ? `${width}px` : `var(--m-drawer-${size})`,
          }}
          onEscapeKeyDown={(e) => {
            const t = e.target as HTMLElement | null;
            if (t?.matches('input, textarea, [contenteditable="true"]'))
              e.preventDefault();
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus?.();
          }}
          tabIndex={-1}
          className={cn(
            'm-sheet fixed inset-y-0 z-[var(--m-z-modal)] flex max-w-full flex-col',
            side === 'left'
              ? 'left-0 border-r border-border-subtle'
              : 'right-0 border-l border-border-subtle',
            'bg-surface-default outline-none m-elevated-modal',
            className,
          )}
        >
          <D.Title className="sr-only">{label}</D.Title>
          {header && (
            <header data-slot="drawer-head" className="m-drawer__head">
              {header}
            </header>
          )}
          <div data-slot="drawer-body" className="m-drawer__body">
            {children}
          </div>
          {footer && (
            <footer data-slot="drawer-foot" className="m-drawer__foot">
              {footer}
            </footer>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
