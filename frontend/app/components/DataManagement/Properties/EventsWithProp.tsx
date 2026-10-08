import { useLocalSort } from '@/lib/use-local-sort';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PagePanel } from '@/ui/layout/PageCard';
import { useQuery } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

import { type DistinctEvent, fetchListByProp } from '../Events/api';

const PAGE_SIZE = 10;
const SORT: Record<string, (a: DistinctEvent, b: DistinctEvent) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  displayName: (a, b) => a.displayName.localeCompare(b.displayName),
};

function EventsWithProp({ propName }: { propName: string }) {
  const { t } = useTranslation();
  const history = useHistory();
  const { projectsStore, filterStore } = useStore();
  const siteId = projectsStore.activeSiteId!;
  const [page, setPage] = React.useState(1);
  const { data = { events: [], total: 0 }, isPending } = useQuery({
    queryKey: ['events-with-prop', siteId, propName],
    queryFn: () => fetchListByProp(propName),
  });
  const events = React.useMemo(
    () =>
      data.events.map((e) => ({
        ...e,
        displayName:
          filterStore.findEvent({ name: e.name })?.displayName || e.name,
      })),
    [data.events],
  );
  const { sort, onSort, sorted } = useLocalSort(events, SORT);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<DistinctEvent>[] = [
    {
      title: t('Event name'),
      key: 'name',
      width: '26%',
      sortable: true,
      render: (e) => (
        <span className="m-truncate m-dmg__mono block">{e.name}</span>
      ),
    },
    {
      title: t('Display name'),
      key: 'displayName',
      width: '24%',
      sortable: true,
      render: (e) => <span className="m-truncate block">{e.displayName}</span>,
    },
    {
      title: t('Description'),
      key: 'description',
      width: '50%',
      render: (e) => (
        <span className="m-truncate block text-content-secondary">
          {e.description || '—'}
        </span>
      ),
    },
  ];

  return (
    <PagePanel
      head={
        <span className="m-ditem__head-title">
          {t('Events with this property')}
          <span className="m-dmg__count">
            {' · '}
            {data.total.toLocaleString()}
          </span>
        </span>
      }
    >
      {isPending ? (
        <SkeletonRows rows={4} columns={[26, 24, 50]} />
      ) : events.length === 0 ? (
        <EmptyState
          title={t('No event sends this property')}
          hint={t(
            'Attach it to an event from your code and the event will be listed here.',
          )}
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
              history.push(
                withSiteId(
                  `${dataManagement.eventsList()}?event=${encodeURIComponent(e.name)}`,
                  siteId,
                ),
              )
            }
            ariaLabel={t('Events with this property')}
          />
          <ListFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={events.length}
            noun={[t('event'), t('events')]}
            onPage={setPage}
          />
        </>
      )}
    </PagePanel>
  );
}

export default observer(EventsWithProp);
