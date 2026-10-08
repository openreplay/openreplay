import { cn } from '@/lib/utils';
import { useWave } from '@/ui/feedback/wave';
import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, PointerEvent as ReactPointerEvent } from 'react';

const button = cva(
  'm-hover m-press relative inline-flex items-center justify-center gap-4 whitespace-nowrap rounded-control font-medium ' +
    'disabled:pointer-events-none disabled:opacity-50 ' +
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          '[--m-wave-color:var(--m-action-primary-bg)] ' +
          'bg-[var(--m-action-primary-bg)] text-[var(--m-action-primary-fg)] ' +
          'hover:bg-[var(--m-action-primary-bg-hover)] active:bg-[var(--m-action-primary-bg-active)]',
        secondary:
          'bg-[var(--m-action-secondary-bg)] text-[var(--m-action-secondary-fg)] ' +
          'border border-[var(--m-action-secondary-border)] ' +
          'hover:bg-[var(--m-action-secondary-bg-hover)] hover:text-content-primary hover:border-border-strong ' +
          'active:bg-[var(--m-action-secondary-bg-active)]',
        subtle:
          'bg-transparent text-[var(--m-action-subtle-fg)] ' +
          'hover:bg-[var(--m-action-subtle-bg-hover)] hover:text-content-primary ' +
          'active:bg-[var(--m-action-subtle-bg-active)]',
        danger:
          '[--m-wave-color:var(--m-action-danger-bg)] ' +
          'bg-[var(--m-action-danger-bg)] text-[var(--m-action-danger-fg)] ' +
          'hover:bg-[var(--m-action-danger-bg-hover)]',

        'danger-outline':
          '[--m-wave-color:var(--m-status-danger-border)] ' +
          'bg-[var(--m-action-secondary-bg)] text-content-danger border border-[var(--m-status-danger-border)] ' +
          'hover:bg-[var(--m-status-danger-bg)] hover:border-[var(--m-content-danger)] hover:text-content-danger',
        'danger-subtle':
          '[--m-wave-color:var(--m-status-danger-border)] ' +
          'bg-transparent text-content-danger hover:bg-[var(--m-status-danger-bg)] hover:text-content-danger',
      },

      size: {
        sm: 'h-control-sm px-4 text-xs',
        md: 'h-control-md px-5 text-sm',
        lg: 'h-control-lg px-6 text-sm',
        icon: 'size-[var(--m-control-height-sm)] shrink-0 p-0 text-xs',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'sm' },
  },
);

export interface ButtonProps
  extends ComponentProps<'button'>, VariantProps<typeof button> {
  asChild?: boolean;

  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  onPointerDown,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const { trigger, rings } = useWave();
  const disabled = props.disabled || loading;
  return (
    <Comp
      data-slot="button"
      className={cn(button({ variant, size }), className)}
      onPointerDown={(e: ReactPointerEvent<HTMLElement>) => {
        // an asChild button has no slot for the ring
        if (!disabled && !asChild) trigger();
        onPointerDown?.(e as never);
      }}
      aria-busy={loading || undefined}
      {...props}
      disabled={disabled}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <LoaderCircle
              size={14}
              strokeWidth={2}
              className="m-spin -ml-1"
              aria-hidden="true"
            />
          )}
          {children}
          {rings}
        </>
      )}
    </Comp>
  );
}

export { button as buttonVariants };
