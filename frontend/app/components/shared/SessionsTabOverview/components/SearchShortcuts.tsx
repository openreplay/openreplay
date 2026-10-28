import { Button } from '@/ui/actions/button';
import { Tooltip } from '@/ui/overlays/tooltip';
import { History, Layers, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import { describeFilters } from 'Shared/FilterEditor';
import type { CatalogueEntry } from 'Shared/FilterEditor/types';

import { useSearchMemory, usualEntries } from '../searchMemory';

interface Props {
  scope: string;
  entries: readonly CatalogueEntry[];
  onAdd: (entry: CatalogueEntry) => void;
}

/** Beside an empty search: the filters this person adds most, then the last
    search and the last segment. Nothing applies by itself. */
function SearchShortcuts({ scope, entries, onAdd }: Props) {
  const { t } = useTranslation();
  const { searchStore, filterStore } = useStore();
  const memory = useSearchMemory(scope);
  const { last } = memory;
  const segment = memory.lastSegmentId
    ? searchStore.list.find((s) => String(s.searchId) === memory.lastSegmentId)
    : undefined;
  const usual = usualEntries(memory, entries);
  const lastSentence = useMemo(
    () =>
      last
        ? describeFilters(
            t,
            filterStore.processFiltersFromData(last.filters) as any[],
            last.eventsOrder,
          )
        : '',
    [last, t],
  );

  if (!last && !segment && !usual.length) return null;
  return (
    <div
      className="m-recs__shortcuts"
      role="group"
      aria-label={t('Search shortcuts')}
    >
      {usual.length > 0 && (
        <span className="m-recs__shortcut-pills">
          {usual.map((e) => (
            <Button
              key={e.id}
              className="m-recs__shortcut"
              onClick={() => onAdd(e)}
              aria-label={t('Add a {{name}} filter', { name: e.displayName })}
            >
              <Plus size={12} aria-hidden="true" />
              {e.displayName}
            </Button>
          ))}
        </span>
      )}
      {usual.length > 0 && (last || segment) && (
        <span className="m-recs__shortcut-sep" aria-hidden="true" />
      )}
      {last && (
        <Tooltip title={lastSentence}>
          <Button
            variant="subtle"
            className="m-recs__shortcut-back"
            onClick={() =>
              searchStore.restoreRules(last.filters, last.eventsOrder)
            }
          >
            <History size={12} aria-hidden="true" />
            {t('Last search')}
          </Button>
        </Tooltip>
      )}
      {segment && (
        <Tooltip title={t('The segment you used last')}>
          <Button
            variant="subtle"
            className="m-recs__shortcut-back"
            onClick={() => searchStore.applySavedSearch(segment)}
          >
            <Layers size={12} aria-hidden="true" />
            <span className="truncate">{segment.name}</span>
          </Button>
        </Tooltip>
      )}
    </div>
  );
}

export default observer(SearchShortcuts);
