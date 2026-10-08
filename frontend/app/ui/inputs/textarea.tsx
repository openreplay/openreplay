import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-control border border-border-default bg-surface-default px-4 py-2',
        'text-sm text-content-primary placeholder:text-content-placeholder',
        'm-hover hover:border-border-strong focus:border-border-strong focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}
