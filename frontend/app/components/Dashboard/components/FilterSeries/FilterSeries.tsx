import type IFilterSeries from '@/mstore/types/filterSeries';
import { IconButton } from '@/ui/actions/IconButton';
import { useToast } from '@/ui/overlays/toast';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import {
  FilterBar,
  buildFilterEditor,
  seriesTarget,
  useCatalogue,
} from 'Shared/FilterEditor';

interface Props {
  seriesIndex: number;
  series: IFilterSeries;
  onRemoveSeries: () => void;
  canDelete?: boolean;
  hideHeader?: boolean;
  observeChanges?: () => void;
  excludeCategory?: string[];
  removeEvents?: boolean;
  excludeEventOrder?: boolean;
  collapseState: boolean;
  onToggleCollapse: () => void;
  seriesNames?: string[];
  lead?: string;
}

/** One series of a card: its name, and the events and filters it counts. */
function FilterSeries({
  seriesIndex,
  series,
  onRemoveSeries,
  canDelete,
  hideHeader = false,
  observeChanges = () => {},
  excludeCategory = [],
  removeEvents,
  excludeEventOrder,
  collapseState,
  onToggleCollapse,
  seriesNames = [],
  lead,
}: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const all = useCatalogue(['sessions']);
  const filters = series.filter.filters;
  const events = filters.filter((f: any) => f.isEvent).length;
  const properties = filters.length - events;
  const eventsFull = series.maxEvents ? events >= series.maxEvents : false;
  const entries = React.useMemo(() => {
    const skip = new Set(excludeCategory.map((c) => c.toLowerCase()));
    return all.filter(
      (e) =>
        !skip.has(e.category) && (!e.isEvent || (!removeEvents && !eventsFull)),
    );
  }, [all, excludeCategory, removeEvents, eventsFull]);
  const editor = buildFilterEditor(seriesTarget(series.filter, observeChanges));
  const open = hideHeader || !collapseState;
  const [name, setName] = React.useState(series.name);
  React.useEffect(() => setName(series.name), [series.name]);

  const commitName = () => {
    const next = name.trim();
    if (!next || next === series.name) {
      setName(series.name);
      return;
    }
    if (seriesNames.includes(next)) {
      toast.error(t('Series name must be unique'));
      setName(series.name);
      return;
    }
    series.update('name', next);
    observeChanges();
  };

  const count =
    filters.length === 0
      ? null
      : `${events === 1 ? t('1 event') : t('{{n}} events', { n: events })} · ${
          properties === 1
            ? t('1 filter')
            : t('{{n}} filters', { n: properties })
        }`;

  return (
    <section
      className={`m-cardp__series${filters.length === 0 ? ' is-blank' : ''}`}
      aria-label={hideHeader ? t('Definition') : series.name}
    >
      {hideHeader ? null : (
        <header className="m-cardp__series-head">
          <button
            type="button"
            className="m-cardp__series-toggle"
            onClick={onToggleCollapse}
            aria-expanded={open}
            aria-label={open ? t('Collapse series') : t('Expand series')}
          >
            {open ? (
              <ChevronDown size={13} aria-hidden="true" />
            ) : (
              <ChevronRight size={13} aria-hidden="true" />
            )}
          </button>
          <input
            className="m-cardp__series-name"
            value={name}
            maxLength={22}
            aria-label={t('Series {{n}} name', { n: seriesIndex + 1 })}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setName(series.name);
            }}
          />
          {count ? (
            <span className="m-cardp__series-count">{count}</span>
          ) : null}
          {canDelete ? (
            <IconButton
              icon={<X size={13} />}
              label={t('Remove {{name}}', { name: series.name })}
              variant="ghost"
              onClick={onRemoveSeries}
            />
          ) : null}
        </header>
      )}
      {open ? (
        <div className="m-cardp__rules">
          <FilterBar
            variant="panel"
            editor={editor}
            entries={entries}
            lead={lead}
            orderLocked={excludeEventOrder}
          />
        </div>
      ) : null}
    </section>
  );
}

export default observer(FilterSeries);
