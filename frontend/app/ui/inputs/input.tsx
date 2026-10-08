import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import { type ComponentProps, type ReactNode, forwardRef } from 'react';

const input = cva(
  'm-hover w-full px-4 text-sm text-content-primary placeholder:text-content-placeholder ' +
    'disabled:cursor-not-allowed disabled:bg-surface-disabled disabled:text-content-disabled',
  {
    variants: {
      variant: {
        outlined:
          'rounded-control border border-border-default bg-surface-default ' +
          'hover:border-border-strong focus:border-border-strong focus:outline-none',

        bare: 'border-0 bg-transparent focus:outline-none focus-visible:outline-none',
      },

      size: {
        sm: 'h-control-sm',
        md: 'h-control-md',
      },
    },
    defaultVariants: { variant: 'outlined', size: 'sm' },
  },
);

export interface InputProps
  extends
    Omit<ComponentProps<'input'>, 'size' | 'prefix'>,
    VariantProps<typeof input> {
  prefix?: ReactNode;

  suffix?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, variant, size, prefix, suffix, ...props },
  ref,
) {
  const field = (
    <input
      ref={ref}
      data-slot="input"
      className={cn(
        input({ variant, size }),
        prefix && 'pl-9',
        suffix && 'pr-9',
        className,
      )}
      {...props}
    />
  );
  if (!prefix && !suffix) return field;

  return (
    <span data-slot="input-affix" className="group/affix relative block w-full">
      {field}
      {prefix && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-content-placeholder group-has-[input:not(:placeholder-shown)]/affix:text-content-secondary [&_svg]:size-[15px]"
        >
          {prefix}
        </span>
      )}
      {suffix && (
        <span className="absolute inset-y-0 right-1 inline-flex items-center">
          {suffix}
        </span>
      )}
    </span>
  );
});
