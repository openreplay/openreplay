import { cn } from '@/lib/utils';
import { useIndicator } from '@/ui/layout/use-indicator';
import * as G from '@radix-ui/react-toggle-group';
import { type ReactNode, useRef } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label?: ReactNode;
  icon?: ReactNode;
  title?: string;

  disabled?: boolean;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
  block,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly SegmentedOption<T>[];
  className?: string;
  ariaLabel?: string;

  block?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);

  const { box: thumb, live } = useIndicator(track, '[data-state="on"]');

  return (
    <G.Root
      ref={track}
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as T)}
      aria-label={ariaLabel}
      data-slot="segmented"
      className={cn(
        'relative inline-flex items-center rounded-track bg-surface-sunken p-1',
        block && 'flex w-full',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'm-travel absolute left-1 top-1 rounded-control border border-border-default bg-surface-default',
          live && 'is-live',
        )}
        style={{
          transform: `translateX(${(thumb?.x ?? 2) - 2}px)`,
          width: thumb?.w ?? 0,
          height: 'calc(var(--m-control-height-sm) - 2px)',
          opacity: thumb ? 1 : 0,
        }}
      />
      {options.map((o) => (
        <G.Item
          key={o.value}
          value={o.value}
          title={o.title}
          disabled={o.disabled}
          className={cn(
            'm-hover relative z-[1] inline-flex h-[calc(var(--m-control-height-sm)-2px)] items-center',
            'justify-center gap-2 rounded-control px-4 text-sm whitespace-nowrap text-content-muted',
            'hover:text-content-primary data-[state=on]:text-content-primary',
            'disabled:cursor-not-allowed disabled:text-content-disabled disabled:hover:text-content-disabled',
            block && 'flex-1',
          )}
        >
          {o.icon}
          {o.label}
        </G.Item>
      ))}
    </G.Root>
  );
}
