import { cn } from '@/lib/utils';
import { useViewportFit } from '@/ui/overlays/use-viewport-fit';
import * as S from '@radix-ui/react-select';
import { Check, ChevronDown, X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export const Select = S.Root;
export const SelectValue = S.Value;

export function SelectTrigger({
  className,
  variant = 'outline',
  children,
  ...props
}: ComponentProps<typeof S.Trigger> & { variant?: 'outline' | 'subtle' }) {
  return (
    <S.Trigger
      data-slot="select-trigger"
      className={cn(
        'inline-flex h-control-sm items-center justify-between gap-3 rounded-control',
        'px-4 text-sm m-hover',
        variant === 'outline' &&
          'border border-border-default bg-surface-default text-content-primary hover:border-border-strong data-[state=open]:border-border-strong',
        variant === 'subtle' &&
          'bg-transparent text-content-secondary hover:bg-surface-hover hover:text-content-primary data-[state=open]:bg-surface-hover data-[state=open]:text-content-primary',
        'data-[placeholder]:text-content-placeholder',
        'disabled:cursor-not-allowed disabled:text-content-disabled',
        className,
      )}
      {...props}
    >
      {children}
      <S.Icon asChild>
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          className="text-content-decorative"
          aria-hidden="true"
        />
      </S.Icon>
    </S.Trigger>
  );
}

export function SelectContent({
  className,
  position = 'popper',
  ref,
  ...props
}: ComponentProps<typeof S.Content>) {
  const fitRef = useViewportFit(ref);
  return (
    <S.Portal>
      <S.Content
        ref={fitRef}
        position={position}
        sideOffset={4}
        className={cn(
          'm-pop z-[var(--m-z-dropdown)] min-w-[var(--radix-select-trigger-width)] overflow-hidden',
          'rounded-surface border border-border-default bg-surface-raised p-3 m-elevated',
          className,
        )}
        {...props}
      >
        <S.Viewport>{props.children}</S.Viewport>
      </S.Content>
    </S.Portal>
  );
}

export function SelectItem({
  className,
  children,
  hint,
  ...props
}: ComponentProps<typeof S.Item> & { hint?: ReactNode }) {
  return (
    <S.Item
      className={cn(
        'relative flex cursor-pointer select-none rounded-control px-5 pr-8 text-sm',
        hint
          ? 'min-h-[var(--m-control-height-md)] flex-col items-start justify-center gap-px py-2'
          : 'h-[var(--m-control-height-md)] items-center gap-4',
        'text-content-secondary outline-none',
        'm-hover data-[highlighted]:bg-surface-hover data-[highlighted]:text-content-primary',
        'data-[state=checked]:bg-surface-active data-[state=checked]:text-content-primary',
        className,
      )}
      {...props}
    >
      <S.ItemText>{children}</S.ItemText>
      {hint && <span className="text-2xs text-content-muted">{hint}</span>}
      <S.ItemIndicator className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
        <Check size={12} strokeWidth={2.5} />
      </S.ItemIndicator>
    </S.Item>
  );
}

export interface InlineSelectOption<T extends string> {
  value: T;
  label: ReactNode;

  hint?: ReactNode;
}

export function InlineSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  id,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly InlineSelectOption<T>[];
  ariaLabel?: string;
  className?: string;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <S.Trigger
        id={id}
        data-slot="select-trigger"
        data-variant="inline"
        aria-label={ariaLabel}
        className={cn(
          'm-hover inline-flex h-control-sm shrink-0 items-center gap-2 rounded-control px-2 text-sm text-content-primary',
          'border border-transparent bg-transparent',
          'hover:border-border-default hover:bg-surface-default',
          'focus-visible:border-border-default focus-visible:bg-surface-default',
          'data-[state=open]:border-border-default data-[state=open]:bg-surface-default',
          className,
        )}
      >
        <SelectValue />
        <S.Icon asChild>
          <ChevronDown
            size={12}
            strokeWidth={1.75}
            className="m-inline-caret text-content-decorative"
            aria-hidden="true"
          />
        </S.Icon>
      </S.Trigger>

      <SelectContent className="min-w-0">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} hint={o.hint}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface SimpleSelectOption<T extends string> {
  value: T;
  label: ReactNode;
}

export function SimpleSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder: placeholderProp,
  clearable,
  ariaLabel,
  className,
  disabled,
  variant,
}: {
  id?: string;
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  options: readonly SimpleSelectOption<T>[];
  placeholder?: string;
  clearable?: boolean;
  ariaLabel?: string;
  className?: string;

  disabled?: boolean;

  variant?: 'outline' | 'subtle';
}) {
  const { t } = useTranslation();
  const placeholder = placeholderProp ?? t('Not set');
  return (
    <span className={cn('relative inline-flex min-w-0', className)}>
      <Select
        // '' keeps Radix controlled and shows the placeholder; undefined would make it uncontrolled
        value={value ?? ''}
        onValueChange={(v) => onChange((v || undefined) as T | undefined)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          variant={variant}
          aria-label={ariaLabel}
          className={cn('w-full', clearable && value != null && 'pr-9')}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {clearable && value != null && (
        <button
          type="button"
          aria-label={t('Clear')}
          onClick={() => onChange(undefined)}
          className="m-hover absolute inset-y-0 right-7 flex items-center text-content-decorative hover:text-content-primary"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
