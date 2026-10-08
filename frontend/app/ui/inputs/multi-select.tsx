import { cn } from '@/lib/utils';
import { PopoverPanel } from '@/ui/overlays/popover';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CheckRow } from './CheckRow';

export interface MultiSelectOption<T extends string> {
  value: T;

  label: ReactNode;

  text?: string;
}

export function MultiSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder: placeholderProp,
  ariaLabel,
  className,
}: {
  id?: string;
  value: readonly T[];
  onChange: (next: T[]) => void;
  options: readonly MultiSelectOption<T>[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const placeholder = placeholderProp ?? t('Not set');
  const [open, setOpen] = useState(false);
  const chosen = options.filter((o) => value.includes(o.value));
  const textOf = (o: MultiSelectOption<T>) =>
    o.text ?? (typeof o.label === 'string' ? o.label : String(o.value));
  const summary =
    chosen.length === 0
      ? null
      : chosen.length === 1 && chosen[0]
        ? textOf(chosen[0])
        : t('{{n}} selected', { n: chosen.length });

  const toggle = (v: T) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <PopoverPanel
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      sideOffset={4}
      className="min-w-[var(--radix-popover-trigger-width)] p-3"
      content={
        <div role="group" aria-label={ariaLabel} className="flex flex-col">
          {options.map((o) => (
            <CheckRow
              key={o.value}
              on={value.includes(o.value)}
              onToggle={() => toggle(o.value)}
            >
              {o.label}
            </CheckRow>
          ))}
        </div>
      }
    >
      <button
        id={id}
        type="button"
        data-slot="select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'inline-flex h-control-sm w-full items-center justify-between gap-3 rounded-control',
          'border border-border-default bg-surface-default px-4 text-sm text-content-primary',
          'm-hover hover:border-border-strong',
          open && 'border-border-strong',
          className,
        )}
      >
        <span
          className={cn(
            'min-w-0 truncate',
            summary == null && 'text-content-placeholder',
          )}
        >
          {summary ?? placeholder}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          className="shrink-0 text-content-decorative"
          aria-hidden="true"
        />
      </button>
    </PopoverPanel>
  );
}
