import withPageTitle from '@/components/hocs/withPageTitle';
import { getSortingKey } from '@/mstore/types/Analytics/Event';
import type Event from '@/mstore/types/Analytics/Event';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable, type TableSort } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DisplayShell, SortControl } from '@/ui/filters/DisplayMenu';
import { DateRange } from '@/ui/inputs/DateRange';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { Tooltip } from '@/ui/overlays/tooltip';
import withPermissions from 'HOCs/withPermissions';
import { RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory, useLocation } from 'App/routing';
import { numberWithCommas } from 'App/utils';

import {
  EntryField,
  FilterBar,
  activityTarget,
  buildFilterEditor,
  useCatalogue,
} from 'Shared/FilterEditor';

import '../data-management.css';
import EventDetailsDrawer from './EventDetailsDrawer';
import { getEventIcon } from './getEventIcon';

const ORDER_KEY = '$__activity_columns_order__$';
const HIDDEN_KEY = '$__activity_columns_hidden__$';
const COLUMNS = [
  'event_name',
  'created_at',
  'distinct_id',
  'city',
  'environment',
] as const;
type ColumnKey = (typeof COLUMNS)[number];

const sortKeyOf = (col: ColumnKey) =>
  getSortingKey(col === 'environment' ? '$os' : col);

const readList = (key: string): string[] => {
  try {
    return localStorage.getItem(key)?.split(',').filter(Boolean) ?? [];
  } catch {
    return [];
  }
};
const writeList = (key: string, list: string[]) => {
  try {
    if (list.length) localStorage.setItem(key, list.join(','));
    else localStorage.removeItem(key);
  } catch {}
};

function ActivityPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const eventId = new URLSearchParams(location.search).get('event_id');
  const { projectsStore, filterStore, analyticsStore, settingsStore } =
    useStore();
  const timezone = settingsStore.sessionSettings.timezone?.value;
  const siteId = projectsStore.activeSiteId;
  const prevSiteId = React.useRef(siteId);
  const entries = useCatalogue(['events']);
  const editor = buildFilterEditor(activityTarget(analyticsStore));
  const noRules = editor.events.length + editor.properties.length === 0;
  const [order, setOrder] = React.useState<string[]>(() => {
    const saved = readList(ORDER_KEY);
    return [...COLUMNS].sort((a, b) => saved.indexOf(a) - saved.indexOf(b));
  });
  const [hidden, setHidden] = React.useState<string[]>(() =>
    readList(HIDDEN_KEY),
  );

  const { page, limit, sortBy, sortOrder } = analyticsStore.payloadFilters;
  const list = analyticsStore.events.events;
  const total = analyticsStore.events.total;
  const loading = analyticsStore.loading;

  React.useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void analyticsStore.checkLatest();
    }, 30000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    void analyticsStore.fetchEvents();
  }, [analyticsStore.payloadFilters, analyticsStore.payloadFilters.filters]);

  React.useEffect(() => {
    if (prevSiteId.current !== siteId) {
      prevSiteId.current = siteId;
      analyticsStore.reset();
    }
  }, [siteId]);

  const isDefaultSort = sortBy === 'created_at' && sortOrder === 'desc';
  const sortColumn = COLUMNS.find((c) => sortKeyOf(c) === sortBy);
  const tableSort: TableSort | null =
    isDefaultSort || !sortColumn
      ? null
      : { key: sortColumn, desc: sortOrder === 'desc' };

  const onSort = (key: string | null, desc: boolean) =>
    analyticsStore.editPayload(
      key
        ? {
            sortBy: sortKeyOf(key as ColumnKey),
            sortOrder: desc ? 'desc' : 'asc',
          }
        : { sortBy: 'created_at', sortOrder: 'desc' },
    );

  const openEvent = (ev: Event) =>
    history.replace({ search: `?event_id=${ev.event_id}` });
  const closeEvent = () => history.replace({ search: '' });
  const openPerson = (id: string, e: React.MouseEvent) => {
    const path = withSiteId(dataManagement.userPage(id), siteId!);
    if (e.metaKey || e.ctrlKey || e.shiftKey) window.open(path, '_blank');
    else history.push(path);
  };

  const moveColumn = (from: string, to: string) => {
    const next = order.filter((k) => k !== from);
    next.splice(
      next.indexOf(to) + (order.indexOf(from) < order.indexOf(to) ? 1 : 0),
      0,
      from,
    );
    setOrder(next);
    writeList(ORDER_KEY, next);
  };
  const toggleColumn = (key: string) => {
    const next = hidden.includes(key)
      ? hidden.filter((k) => k !== key)
      : [...hidden, key];
    if (next.length === COLUMNS.length) return;
    setHidden(next);
    writeList(HIDDEN_KEY, next);
  };
  const resetDisplay = () => {
    setOrder([...COLUMNS]);
    setHidden([]);
    writeList(ORDER_KEY, []);
    writeList(HIDDEN_KEY, []);
    onSort(null, false);
  };

  const all: Record<ColumnKey, Column<Event>> = {
    event_name: {
      title: t('Event name'),
      key: 'event_name',
      width: '26%',
      sortable: true,
      render: (e) => (
        <span className="m-dmg__identity-cell">
          <Tooltip
            title={e.isAutoCapture ? t('Autocaptured') : t('Custom event')}
            delay={300}
          >
            <span className="m-dmg__hidden-icon inline-flex">
              {getEventIcon(e.isAutoCapture, e.event_name)}
            </span>
          </Tooltip>
          <span className="m-truncate m-dmg__mono">
            {filterStore.getFilterDisplayName(e.event_name)}
          </span>
        </span>
      ),
    },
    created_at: {
      title: t('Time'),
      key: 'created_at',
      width: '16%',
      sortable: true,
      render: (e) => <RelativeTime at={e.created_at} timezone={timezone} />,
    },
    distinct_id: {
      title: t('Distinct ID'),
      key: 'distinct_id',
      width: '24%',
      sortable: true,
      render: (e) =>
        e.user_id ? (
          <Tooltip title={t('Open this person')} delay={400}>
            <button
              type="button"
              className="m-truncate m-dmg__mono m-dmg__link block max-w-full"
              onClick={(ev) => openPerson(e.distinct_id, ev)}
            >
              {e.distinct_id}
            </button>
          </Tooltip>
        ) : (
          <Tooltip title={t('This user was not identified yet')} delay={300}>
            <span className="m-truncate m-dmg__mono block text-content-disabled">
              {e.distinct_id}
            </span>
          </Tooltip>
        ),
    },
    city: {
      title: t('City'),
      key: 'city',
      width: '17%',
      sortable: true,
      render: (e) => <span className="m-truncate block">{e.city}</span>,
    },
    environment: {
      title: t('Environment'),
      key: 'environment',
      width: '17%',
      sortable: true,
      render: (e) => <span className="m-truncate block">{e.environment}</span>,
    },
  };
  const columns = order
    .filter((k) => !hidden.includes(k))
    .map((k) => all[k as ColumnKey]);

  const displayChanges =
    (isDefaultSort ? 0 : 1) +
    (hidden.length ? 1 : 0) +
    (order.join() !== COLUMNS.join() ? 1 : 0);

  const empty = noRules ? (
    <EmptyState
      art="activity"
      title={t('Nothing in this window')}
      hint={t('Widen the date window, or refresh to pull the latest events.')}
      action={
        <Button onClick={() => void analyticsStore.fetchEvents()}>
          {t('Refresh')}
        </Button>
      }
    />
  ) : (
    <EmptyState
      art="search"
      title={t('No events match these filters')}
      hint={t('Loosen a rule, or clear them to see the full log.')}
      action={
        <Button onClick={() => analyticsStore.reset()}>
          {t('Clear filters')}
        </Button>
      }
    />
  );

  return (
    <PageCard
      title={t('Activity')}
      subtitle={t(
        'Every event in order, with the user and the page it came from.',
      )}
      split
    >
      <EntryField
        entries={entries}
        taken={editor.properties.map((f) => f.entry.id)}
        onPick={editor.onAdd}
        hasRules={!noRules}
        placeholder={t('Filter the activity')}
      />
      {!noRules && (
        <PagePanel spills>
          <FilterBar
            editor={editor}
            entries={entries}
            lead={t('Filter the activity')}
            orderLocked
          />
        </PagePanel>
      )}
      <PagePanel
        head={
          <>
            <span className="m-dmg__count">
              {t('{{n}} events', { n: numberWithCommas(total) })}
            </span>
            <span className="m-page__controls">
              <DateRange
                field={t('Occurred')}
                period={analyticsStore.period}
                onChange={analyticsStore.updateTimestamps}
              />
              <DisplayShell
                changeCount={displayChanges}
                onReset={resetDisplay}
                rows={[
                  {
                    id: 'act-sort',
                    label: t('Order'),
                    control: (
                      <SortControl<ColumnKey>
                        id="act-sort"
                        value={sortColumn ?? 'created_at'}
                        desc={sortOrder === 'desc'}
                        choices={COLUMNS.map((c) => ({
                          value: c,
                          label: String(all[c].title),
                        }))}
                        onValue={(c) => onSort(c, sortOrder === 'desc')}
                        onDesc={(d) => onSort(sortColumn ?? 'created_at', d)}
                      />
                    ),
                  },
                ]}
                fields={order.map((k) => ({
                  value: k,
                  label: String(all[k as ColumnKey].title),
                  on: !hidden.includes(k),
                }))}
                onToggleField={toggleColumn}
              />
              <IconButton
                icon={<RefreshCw size={14} />}
                label={t('Refresh')}
                variant="ghost"
                onClick={() => void analyticsStore.fetchEvents()}
              />
            </span>
          </>
        }
      >
        {analyticsStore.newEvents > 0 && (
          <button
            type="button"
            className="m-dmg__latest"
            onClick={() => void analyticsStore.fetchEvents()}
          >
            {t('Show {{n}} new events', {
              n: numberWithCommas(analyticsStore.newEvents),
            })}
          </button>
        )}
        {loading && list.length === 0 ? (
          <SkeletonRows rows={6} columns={[26, 16, 24, 17, 17]} />
        ) : total === 0 ? (
          empty
        ) : (
          <>
            <DataTable<Event>
              rowKey={(e) => e.event_id}
              columns={columns}
              rows={list}
              sort={tableSort}
              onSort={onSort}
              onColumnMove={moveColumn}
              onRowClick={openEvent}
              ariaLabel={t('Activity log')}
            />
            <ListFooter
              page={page}
              pageSize={limit}
              total={total}
              noun={[t('event'), t('events')]}
              onPage={(p) => analyticsStore.editPayload({ page: p })}
            />
          </>
        )}
      </PagePanel>
      <EventDetailsDrawer eventId={eventId} onClose={closeEvent} />
    </PageCard>
  );
}

export default withPageTitle('Activity')(
  withPermissions(
    ['DATA_MANAGEMENT'],
    '',
    false,
    false,
  )(observer(ActivityPage)),
);
