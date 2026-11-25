import { cn } from '@/lib/utils';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { PopoverPanel } from '@/ui/overlays/popover';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CheckRow } from './CheckRow';
import './multi-select.css';

export interface MultiSelectOption<T extends string> {
  value: T;

  label: ReactNode;

  text?: string;
  /** a second line under the label */
  hint?: ReactNode;
  icon?: ReactNode;
  /** drawn instead of the check row when this choice can't be made here */
  locked?: ReactNode;
}

export function MultiSelect<T extends string>({
  id,
  value,
  onChange,
  options,
  placeholder: placeholderProp,
  ariaLabel,
  className,
  searchable,
  allLabel,
}: {
  id?: string;
  value: readonly T[];
  onChange: (next: T[]) => void;
  options: readonly MultiSelectOption<T>[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** a search field over a scrolling list, chosen ones first */
  searchable?: { placeholder: string; empty?: string };
  /** the closed control's words when every choice that can be made is made */
  allLabel?: string;
}) {
  const { t } = useTranslation();
  const placeholder = placeholderProp ?? t('Not set');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // a locked option is drawn unpicked, so the closed control doesn't name it either
  const chosen = options.filter(
    (o) => o.locked == null && value.includes(o.value),
  );
  const textOf = (o: MultiSelectOption<T>) =>
    o.text ?? (typeof o.label === 'string' ? o.label : String(o.value));
  // names, not a count: two fit, past two the first two and how many more
  const pickable = options.filter((o) => o.locked == null);
  const summary =
    chosen.length === 0
      ? null
      : allLabel &&
          pickable.length > 1 &&
          pickable.every((o) => value.includes(o.value))
        ? allLabel
        : chosen.length <= 2
          ? chosen.map(textOf).join(', ')
          : `${chosen.slice(0, 2).map(textOf).join(', ')} +${chosen.length - 2}`;

  const toggle = (v: T) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const shown = useMemo(() => {
    if (!searchable) return options;
    const q = query.trim().toLowerCase();
    const hit = options.filter(
      (o) => !q || textOf(o).toLowerCase().includes(q),
    );
    return [
      ...hit.filter((o) => value.includes(o.value)),
      ...hit.filter((o) => !value.includes(o.value)),
    ];
  }, [options, query, searchable, value]);
  const rich = options.some((o) => o.hint != null || o.icon != null);
  const rows = shown.map((o) =>
    o.locked != null ? (
      <div key={o.value}>{o.locked}</div>
    ) : (
      <CheckRow
        key={o.value}
        on={value.includes(o.value)}
        onToggle={() => toggle(o.value)}
        hint={o.hint}
        icon={o.icon}
      >
        {o.label}
      </CheckRow>
    ),
  );

  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
      placement="bottomLeft"
      sideOffset={4}
      className={cn(
        'min-w-[var(--radix-popover-trigger-width)]',
        searchable
          ? 'm-mselect--search p-0'
          : rich
            ? 'm-mselect--rich p-2'
            : 'max-w-[max(var(--radix-popover-trigger-width),20rem)] p-3',
      )}
      content={
        searchable ? (
          <div className="flex flex-col">
            <PopoverSearch
              placeholder={searchable.placeholder}
              value={query}
              onChange={setQuery}
            />
            <div
              role="group"
              aria-label={ariaLabel}
              className="m-mselect__list"
            >
              {rows}
              {shown.length === 0 && (
                <p className="m-mselect__none">
                  {searchable.empty ?? t('Nothing matches.')}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div role="group" aria-label={ariaLabel} className="flex flex-col">
            {rows}
          </div>
        )
      }
    >
      <button
        id={id}
        type="button"
        data-slot="select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={chosen.length ? chosen.map(textOf).join(', ') : undefined}
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
