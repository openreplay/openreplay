import withPageTitle from '@/components/hocs/withPageTitle';
import { useLocalSort } from '@/lib/use-local-sort';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import { Tooltip } from '@/ui/overlays/tooltip';
import { useQuery } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { BookOpen } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { sessions, withSiteId } from 'App/routes';
import { useHistory, useLocation } from 'App/routing';

import '../data-management.css';
import { DM_DOCS, HiddenMark, compact } from '../shared';
import DistinctEventPage from './DistinctEvent';
import { type DistinctEvent, fetchList } from './api';

type EventFilter = 'all' | 'autocaptured' | 'my_events';

const PAGE_SIZE = 10;
const FILTER_KEY = 'data-management-events-filter';
const readFilter = (): EventFilter => {
  try {
    const v = localStorage.getItem(FILTER_KEY);
    if (v === 'autocaptured' || v === 'my_events') return v;
  } catch {}
  return 'all';
};

const SORT: Record<string, (a: DistinctEvent, b: DistinctEvent) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  displayName: (a, b) => a.displayName.localeCompare(b.displayName),
  count: (a, b) => a.count - b.count,
};

function EventsListPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const shownEvent = new URLSearchParams(location.search).get('event');
  const { projectsStore, filterStore, searchStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const [filter, setFilter] = React.useState<EventFilter>(readFilter);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const {
    data = { events: [], total: 0 },
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['distinct-events-list', siteId],
    queryFn: () => fetchList(),
  });

  const q = query.trim().toLowerCase();
  const visible = React.useMemo(
    () =>
      data.events
        .filter((e) =>
          filter === 'all'
            ? true
            : filter === 'autocaptured'
              ? e.autoCaptured
              : !e.autoCaptured,
        )
        .filter(
          (e) =>
            !q ||
            e.name.toLowerCase().includes(q) ||
            e.displayName.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q),
        )
        .sort((a, b) => b.count - a.count),
    [data.events, filter, q],
  );
  const { sort, onSort, sorted } = useLocalSort(visible, SORT);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (shownEvent) {
    const event = data.events.find((e) => e.name === shownEvent);
    const back = () => history.push({ search: '' });
    if (isPending)
      return (
        <PageCard
          back={{ label: t('Events'), onClick: back }}
          title={shownEvent}
        >
          <SkeletonRows rows={4} columns={[30, 70]} />
        </PageCard>
      );
    if (!event)
      return (
        <PageCard
          back={{ label: t('Events'), onClick: back }}
          title={shownEvent}
        >
          <EmptyState
            art="events"
            title={t('Event {{name}} not found', { name: shownEvent })}
            action={<Button onClick={back}>{t('Back to events')}</Button>}
          />
        </PageCard>
      );
    const openSessions = () => {
      const f = filterStore.findEvent({ name: event.name });
      if (!f) return;
      searchStore.addFilterOnce(f);
      history.push(withSiteId(sessions(), siteId!));
    };
    return (
      <DistinctEventPage
        event={event}
        onBack={back}
        openSessions={openSessions}
        refetchList={refetch}
      />
    );
  }

  const pick = (key: string) => {
    setFilter(key as EventFilter);
    setPage(1);
    try {
      localStorage.setItem(FILTER_KEY, key);
    } catch {}
  };

  const columns: Column<DistinctEvent>[] = [
    {
      title: t('Event name'),
      key: 'name',
      width: '22%',
      sortable: true,
      render: (e) => (
        <span className="m-dmg__identity-cell">
          <span className="m-truncate m-dmg__mono">{e.name}</span>
          {e.status === 'hidden' && <HiddenMark />}
        </span>
      ),
    },
    {
      title: t('Display name'),
      key: 'displayName',
      width: '20%',
      sortable: true,
      render: (e) => <span className="m-truncate block">{e.displayName}</span>,
    },
    {
      title: t('Description'),
      key: 'description',
      width: '40%',
      render: (e) =>
        e.description ? (
          <Tooltip title={e.description} delay={400}>
            <span className="m-truncate block text-content-secondary">
              {e.description}
            </span>
          </Tooltip>
        ) : (
          <span className="text-content-disabled">—</span>
        ),
    },
    {
      title: t('30-day volume'),
      key: 'count',
      width: '18%',
      align: 'right',
      sortable: true,
      render: (e) => (
        <span className="m-dmg__mono">{compact.format(e.count)}</span>
      ),
    },
  ];

  const counts = {
    all: data.events.length,
    autocaptured: data.events.filter((e) => e.autoCaptured).length,
    my_events: data.events.filter((e) => !e.autoCaptured).length,
  };

  return (
    <PageCard
      title={t('Events')}
      subtitle={t(
        'Every event name the tracker has recorded, autocaptured or custom.',
      )}
      actions={
        <>
          <SearchField
            placeholder={t('Search events')}
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(1);
            }}
          />
          <IconButton
            icon={<BookOpen size={14} />}
            label={t('Documentation')}
            variant="ghost"
            onClick={() => window.open(DM_DOCS, '_blank')}
          />
        </>
      }
      toolbar={
        <FilterStrip
          label={t('Filter by kind')}
          items={[
            { key: 'all', label: t('All events'), count: counts.all },
            {
              key: 'autocaptured',
              label: t('Autocaptured'),
              count: counts.autocaptured,
            },
            { key: 'my_events', label: t('Custom'), count: counts.my_events },
          ]}
          selected={[filter]}
          onSelect={pick}
        />
      }
    >
      {isPending ? (
        <SkeletonRows rows={5} columns={[22, 20, 40, 18]} />
      ) : data.events.length === 0 ? (
        <EmptyState
          art="events"
          title={t('No events yet')}
          hint={t(
            'Clicks, pages and inputs name themselves as sessions come in. Rename the ones that matter; the rest keep the name they arrived with.',
          )}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          art="search"
          title={
            q ? t('No events match your search') : t('No events of this kind')
          }
          hint={t('Clear the search, or pick another filter.')}
          action={
            <Button
              onClick={() => {
                setQuery('');
                pick('all');
              }}
            >
              {t('Show all events')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable<DistinctEvent>
            rowKey={(e) => e.name}
            columns={columns}
            rows={rows}
            sort={sort}
            onSort={onSort}
            onRowClick={(e) =>
              history.push({
                search: new URLSearchParams({ event: e.name }).toString(),
              })
            }
            ariaLabel={t('Events')}
          />
          <ListFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={visible.length}
            noun={[t('event'), t('events')]}
            onPage={setPage}
          />
        </>
      )}
    </PageCard>
  );
}

export default withPageTitle('Events')(
  withPermissions(
    ['DATA_MANAGEMENT'],
    '',
    false,
    false,
  )(observer(EventsListPage)),
);
