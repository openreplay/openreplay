import { cn } from '@/lib/utils';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { PopoverPanel } from '@/ui/overlays/popover';
import {
  ALargeSmall,
  ChevronDown,
  ChevronRight,
  Gauge,
  LayoutGrid,
  List,
  MousePointerClick,
  Search,
  User,
  Zap,
} from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { TriggerGroup, TriggerOption } from 'App/mstore/alertsStore';
import 'Components/shared/FilterEditor/filter-picker.css';

import '../../product-analytics.css';

const GROUPS: { key: TriggerGroup; label: string }[] = [
  { key: 'cards', label: 'Cards' },
  { key: 'predefined', label: 'Predefined' },
  { key: 'events', label: 'Event properties' },
  { key: 'users', label: 'User properties' },
];
const CATEGORY_ICON: Record<TriggerGroup, ReactNode> = {
  cards: <LayoutGrid size={13} />,
  predefined: <Gauge size={13} />,
  events: <Zap size={13} />,
  users: <User size={13} />,
};
const ROW_ICON: Record<TriggerGroup, ReactNode> = {
  cards: <LayoutGrid size={13} />,
  predefined: <Gauge size={13} />,
  events: <MousePointerClick size={13} />,
  users: <ALargeSmall size={13} />,
};
const ALL = 'all';
type Cat = TriggerGroup | typeof ALL;

/** The alert's metric: a search over four groups, drawn as the omnisearch. */
export function MetricPicker({
  options,
  value,
  onChange,
}: {
  options: readonly TriggerOption[];
  value: string | number | undefined;
  onChange: (option: TriggerOption) => void;
}) {
  const { t } = useTranslation();
  const current = options.find((o) => String(o.value) === String(value));
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Cat>(current?.group ?? 'predefined');
  const q = query.trim().toLowerCase();

  const hits = useMemo(
    () =>
      q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options,
    [options, q],
  );
  const rows =
    q || group === ALL ? hits : hits.filter((o) => o.group === group);
  const countOf = (g: TriggerGroup) => hits.filter((o) => o.group === g).length;
  const labelOf = (g: TriggerGroup) =>
    t(GROUPS.find((x) => x.key === g)!.label);
  const tagged = !!q || group === ALL;

  return (
    <PopoverPanel
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && current) setGroup(current.group);
        if (!o) setQuery('');
      }}
      placement="bottomLeft"
      sideOffset={4}
      className="m-metricpick p-0"
      content={
        <div className="m-pick2">
          <PopoverSearch
            className="m-pick2__search"
            placeholder={t('Search metrics')}
            value={query}
            onChange={setQuery}
            lead={
              <span className="m-pick__search-glyph" aria-hidden="true">
                <Search size={13} />
              </span>
            }
          />
          <div className="m-pick2__body">
            <div
              className={`m-pick2__rail${q ? ' is-searching' : ''}`}
              role="tablist"
              aria-label={t('Metric groups')}
            >
              {([ALL, ...GROUPS.map((g) => g.key)] as Cat[]).map((k) => {
                const n = k === ALL ? 0 : countOf(k);
                const on = group === k && !q;
                return (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    className={`m-pick2__cat${on ? ' is-on' : ''}${k !== ALL && n === 0 ? ' is-empty' : ''}`}
                    onClick={() => {
                      setGroup(k);
                      setQuery('');
                    }}
                  >
                    <span className="m-pick2__glyph" aria-hidden="true">
                      {k === ALL ? <List size={13} /> : CATEGORY_ICON[k]}
                    </span>
                    <span className="m-truncate">
                      {k === ALL ? t('All') : labelOf(k)}
                    </span>
                    {k !== ALL && <span className="m-pick2__n">{n}</span>}
                    <ChevronRight
                      size={12}
                      className="m-pick2__chev"
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
            <div
              className="m-pick2__list"
              role="listbox"
              aria-label={t('Metrics')}
            >
              {rows.map((o) => {
                const on = String(o.value) === String(value);
                return (
                  <button
                    key={`${o.group}:${o.value}`}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={`m-pick2__row${on ? ' is-current' : ''}`}
                    onClick={() => {
                      onChange(o);
                      setOpen(false);
                    }}
                  >
                    <span className="m-pick2__glyph" aria-hidden="true">
                      {ROW_ICON[o.group]}
                    </span>
                    <span className="m-pick2__name m-truncate" title={o.label}>
                      {o.label}
                    </span>
                    {tagged && (
                      <span className="m-pick2__tag">{labelOf(o.group)}</span>
                    )}
                    {o.custom && (
                      <span className="m-pick2__tag">{t('Custom')}</span>
                    )}
                    {!tagged && o.unit && o.unit !== 'count' && (
                      <span className="m-pick2__tag">{o.unit}</span>
                    )}
                  </button>
                );
              })}
              {rows.length === 0 && (
                <p className="m-pick__none">{t('No metric matches that.')}</p>
              )}
            </div>
          </div>
        </div>
      }
    >
      <button
        type="button"
        data-slot="select-trigger"
        aria-label={t('Metric')}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={current?.label}
        className={cn(
          'inline-flex h-control-sm w-full items-center justify-between gap-3 rounded-control',
          'border border-border-default bg-surface-default px-4 text-sm text-content-primary',
          'm-hover hover:border-border-strong',
          open && 'border-border-strong',
        )}
      >
        <span
          className={cn(
            'min-w-0 truncate',
            !current && 'text-content-placeholder',
          )}
        >
          {current?.label ?? t('Select metric')}
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
