import { cn } from '@/lib/utils';
import * as C from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import type { ComponentProps } from 'react';

export function Checkbox({
  className,
  ...props
}: ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        'peer size-[14px] shrink-0 rounded-check border border-border-strong bg-surface-default',
        'm-hover',
        'data-[state=checked]:border-[var(--m-action-accent-bg)] data-[state=checked]:bg-[var(--m-action-accent-bg)]',
        'data-[state=indeterminate]:border-[var(--m-action-accent-bg)] data-[state=indeterminate]:bg-[var(--m-action-accent-bg)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <C.Indicator className="m-mark flex items-center justify-center text-[var(--m-action-accent-fg)]">
        {props.checked === 'indeterminate' ? (
          <Minus size={10} strokeWidth={3} />
        ) : (
          <Check size={10} strokeWidth={3} />
        )}
      </C.Indicator>
    </C.Root>
  );
}
