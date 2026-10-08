import { cn } from '@/lib/utils';
import * as T from '@radix-ui/react-tabs';
import { type ComponentProps, useRef } from 'react';

import { useIndicator } from './use-indicator';

export const Tabs = T.Root;
export const TabsContent = T.Content;

export function TabsList({
  className,
  children,
  ...props
}: ComponentProps<typeof T.List>) {
  const list = useRef<HTMLDivElement>(null);

  const { box: ink, live } = useIndicator(list, '[data-state="active"]');

  return (
    <T.List
      ref={list}
      className={cn(
        'relative flex items-center gap-7 border-b border-border-subtle',
        className,
      )}
      {...props}
    >
      {children}

      <span
        aria-hidden="true"
        className={cn(
          'm-travel absolute bottom-[-1px] left-0 h-px bg-[var(--m-content-primary)]',
          live && 'is-live',
        )}
        style={{
          transform: `translateX(${ink?.x ?? 0}px)`,
          width: ink?.w ?? 0,
          opacity: ink ? 1 : 0,
        }}
      />
    </T.List>
  );
}

export function TabsTrigger({
  className,
  onPointerDown,
  onKeyDown,
  onBlur,
  ...props
}: ComponentProps<typeof T.Trigger>) {
  return (
    <T.Trigger
      className={cn(
        'py-4 text-sm leading-[1.25rem] text-content-muted',
        'm-hover hover:text-content-primary data-[state=active]:text-content-primary',
        'data-[pointer]:outline-none',
        className,
      )}
      // Radix focuses the trigger from script on mousedown, which Chrome
      // treats as :focus-visible; keep the ring for keyboard focus only.
      onPointerDown={(e) => {
        e.currentTarget.dataset.pointer = '';
        onPointerDown?.(e);
      }}
      onKeyDown={(e) => {
        delete e.currentTarget.dataset.pointer;
        onKeyDown?.(e);
      }}
      onBlur={(e) => {
        delete e.currentTarget.dataset.pointer;
        onBlur?.(e);
      }}
      {...props}
    />
  );
}
