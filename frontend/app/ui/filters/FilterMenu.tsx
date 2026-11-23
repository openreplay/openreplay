import { IconButton } from '@/ui/actions/IconButton';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { useViewport } from '@/ui/layout/use-viewport';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { menuKeyDown } from '@/ui/overlays/menuKeys';
import { PopoverPanel } from '@/ui/overlays/popover';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type FilterStripProps,
  StripChoices,
  stripActive,
} from './FilterStrip';
import { SheetSection, useInFilterSheet, useSheetCount } from './PhoneFilters';
import './filter-menu.css';

export interface FilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
  count?: ReactNode;
}

export interface FilterDimension<K extends string = string> {
  key: K;
  label: string;
  icon?: ReactNode;
  hint?: string;
  single?: boolean;
  options: FilterOption[];
  /** Controls under the open dimension's options (match mode, create). */
  footer?: ReactNode;
}

/** One button for every list filter: dimensions, then their values. */
export function FilterMenu<K extends string = string>({
  dimensions,
  isActive,
  onToggle,
  activeCount,
  label,
  strip,
}: {
  dimensions: FilterDimension<K>[];
  isActive: (key: K, value: string) => boolean;
  onToggle: (key: K, value: string) => void;
  activeCount: number;
  label?: string;
  /** the page's strip, drawn as "Show" here at phone (it folds into this) */
  strip?: FilterStripProps;
}) {
  const { t } = useTranslation();
  const inSheet = useInFilterSheet();
  const folded = useViewport() === 'phone' && strip != null && !inSheet;
  const stripOn = strip != null && stripActive(strip);
  const badge = activeCount + (folded && stripOn ? 1 : 0);
  const [open, setOpen] = useState(false);
  const [openKey, setOpenKey] = useState<K | null>(null);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [];
    return dimensions.flatMap((d) =>
      d.options
        .filter(
          (o) =>
            o.label.toLowerCase().includes(q) ||
            d.label.toLowerCase().includes(q),
        )
        .map((o) => ({ dimension: d, option: o })),
    );
  }, [dimensions, q]);

  const active = dimensions.find((d) => d.key === openKey) ?? null;
  const reset = () => {
    setOpenKey(null);
    setQuery('');
  };

  const content = (
    <div className="m-fm" role="menu" onKeyDown={menuKeyDown}>
      <PopoverSearch
        className="m-fm__search"
        placeholder={
          active && !q
            ? t('Filter {{dim}}', { dim: active.label.toLowerCase() })
            : t('Add filter')
        }
        label={t('Search filters')}
        value={query}
        onChange={setQuery}
        lead={
          active && !q ? (
            <button
              type="button"
              className="m-fm__back"
              onClick={() => setOpenKey(null)}
              aria-label={t('Back to all filters')}
            >
              <ChevronLeft size={14} />
              <span>{active.label}</span>
            </button>
          ) : null
        }
      />
      <div className="m-fm__body">
        {q &&
          (matches.length === 0 ? (
            <p className="m-fm__none">{t('Nothing matches that.')}</p>
          ) : (
            matches.map(({ dimension, option }) => (
              <CheckRow
                key={`${dimension.key}:${option.value}`}
                on={isActive(dimension.key, option.value)}
                single={dimension.single}
                icon={option.icon}
                meta={
                  <span className="m-fm__meta">
                    <span className="m-fm__dim">{dimension.label}</span>
                    {option.count}
                  </span>
                }
                onToggle={() => onToggle(dimension.key, option.value)}
              >
                {option.label}
              </CheckRow>
            ))
          ))}
        {!q && !active && folded && (
          <div className="m-fm__strip">
            <p className="m-fm__heading">{t('Show')}</p>
            <StripChoices {...strip} />
          </div>
        )}
        {!q &&
          !active &&
          dimensions.map((d) => {
            const applied = d.options.filter((o) =>
              isActive(d.key, o.value),
            ).length;
            return (
              <button
                key={d.key}
                type="button"
                role="menuitem"
                className="m-fm__dim-row"
                onClick={() => setOpenKey(d.key)}
                aria-haspopup="menu"
              >
                <span className="m-fm__dim-icon" aria-hidden="true">
                  {d.icon ?? <ListFilter size={14} />}
                </span>
                <span className="m-fm__dim-label">{d.label}</span>
                {applied > 0 && (
                  <span className="m-fm__applied">{applied}</span>
                )}
                <ChevronRight
                  size={13}
                  className="m-fm__caret"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        {!q && active && (
          <>
            {active.hint && <p className="m-fm__hint">{active.hint}</p>}
            {active.options.length === 0 && (
              <p className="m-fm__none">{t('Nothing to filter by yet.')}</p>
            )}
            {active.options.map((o) => (
              <CheckRow
                key={o.value}
                on={isActive(active.key, o.value)}
                single={active.single}
                icon={o.icon}
                meta={o.count}
                onToggle={() => onToggle(active.key, o.value)}
              >
                {o.label}
              </CheckRow>
            ))}
          </>
        )}
      </div>
      {!q && active?.footer && (
        <div className="m-fm__foot">{active.footer}</div>
      )}
    </div>
  );

  useSheetCount(inSheet ? activeCount + (stripOn ? 1 : 0) : 0);
  // the drawer: each dimension a row that opens its options in place
  if (inSheet)
    return (
      <>
        {strip && (
          <SheetSection title={t('Show')} first>
            <StripChoices {...strip} />
          </SheetSection>
        )}
        <SheetSection title={label ?? t('Filters')}>
          <div className="m-fm-sheet">
            {dimensions.map((d) => {
              const applied = d.options.filter((o) =>
                isActive(d.key, o.value),
              ).length;
              const expanded = openKey === d.key;
              return (
                <div
                  key={d.key}
                  className={`m-fm-sheet__dim${expanded ? ' is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="m-fm-sheet__row m-hover"
                    aria-expanded={expanded}
                    onClick={() => setOpenKey(expanded ? null : d.key)}
                  >
                    <span className="m-fm__dim-icon" aria-hidden="true">
                      {d.icon ?? <ListFilter size={15} />}
                    </span>
                    <span className="m-fm-sheet__label">{d.label}</span>
                    {applied > 0 && (
                      <span className="m-fm__applied">{applied}</span>
                    )}
                    <ChevronDown
                      size={15}
                      className="m-fm-sheet__caret"
                      aria-hidden="true"
                    />
                  </button>
                  {expanded && (
                    <div className="m-fm-sheet__opts">
                      {d.hint && <p className="m-fm__hint">{d.hint}</p>}
                      {d.options.map((o) => (
                        <CheckRow
                          key={o.value}
                          on={isActive(d.key, o.value)}
                          single={d.single}
                          icon={o.icon}
                          meta={o.count}
                          onToggle={() => onToggle(d.key, o.value)}
                        >
                          {o.label}
                        </CheckRow>
                      ))}
                      {d.footer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SheetSection>
      </>
    );

  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
      placement="bottomRight"
      content={content}
    >
      <IconButton
        icon={<ListFilter size={15} />}
        label={label ?? t('Filters')}
        count={badge}
        active={badge > 0}
        open={open}
      />
    </PopoverPanel>
  );
}
