import { cn } from '@/lib/utils';
import { Tooltip } from '@/ui/overlays/tooltip';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

export interface MenuButtonOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;

  hint?: string;
}

export interface MenuButtonProps<T extends string> {
  icon?: ReactNode;

  label?: ReactNode;
  value: T | null;
  onChange: (v: T) => void;
  options: readonly MenuButtonOption<T>[];

  onClear?: () => void;

  clearLabel?: string;
  ariaLabel: string;

  variant?: 'text' | 'outline';
  align?: 'start' | 'end';
  className?: string;
}

export function MenuButton<T extends string>({
  icon,
  label,
  value,
  onChange,
  options,
  onClear,
  clearLabel: clearLabelProp,
  ariaLabel,
  variant = 'text',
  align = 'start',
  className,
}: MenuButtonProps<T>) {
  const { t } = useTranslation();
  const clearLabel = clearLabelProp ?? t('None');
  const chosen = options.find((o) => o.value === value);
  const text = label ?? chosen?.label ?? '';
  return (
    <span className={cn('inline-flex items-center', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            data-slot="menu-button"
            className={cn(
              'm-hover inline-flex h-control-sm items-center gap-2 whitespace-nowrap rounded-control px-3 text-sm',
              variant === 'text' &&
                'text-content-secondary hover:bg-surface-hover hover:text-content-primary data-[state=open]:bg-surface-hover data-[state=open]:text-content-primary',
              variant === 'outline' &&
                'border border-border-default bg-surface-default text-content-primary hover:border-border-strong data-[state=open]:border-border-strong',
            )}
          >
            {icon && (
              <span className="inline-flex text-content-decorative [&_svg]:size-[13px]">
                {icon}
              </span>
            )}
            <span>{text}</span>
            <ChevronDown
              size={12}
              strokeWidth={1.75}
              className="text-content-decorative"
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align}>
          {onClear && (
            <DropdownMenuItem
              onSelect={onClear}
              aria-checked={value == null}
              role="menuitemradio"
            >
              <span className="flex-1">{clearLabel}</span>
              <span className="inline-flex w-3 justify-end" aria-hidden="true">
                {value == null && <Check size={12} strokeWidth={2.5} />}
              </span>
            </DropdownMenuItem>
          )}
          {options.map((o) => {
            const item = (
              <DropdownMenuItem
                key={o.value}
                disabled={o.disabled}
                onSelect={() => onChange(o.value)}
                aria-checked={o.value === value}
                role="menuitemradio"
              >
                {o.icon && (
                  <span className="inline-flex text-content-decorative [&_svg]:size-[13px]">
                    {o.icon}
                  </span>
                )}
                <span className="flex-1">{o.label}</span>
                <span
                  className="inline-flex w-3 justify-end"
                  aria-hidden="true"
                >
                  {o.value === value && <Check size={12} strokeWidth={2.5} />}
                </span>
              </DropdownMenuItem>
            );
            return o.disabled && o.hint ? (
              <Tooltip key={o.value} title={o.hint} side="left">
                <span className="block">{item}</span>
              </Tooltip>
            ) : (
              item
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}
