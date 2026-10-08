import { useLocalSort } from '@/lib/use-local-sort';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { Segmented } from '@/ui/inputs/toggle-group';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PagePanel } from '@/ui/layout/PageCard';
import { useQuery } from '@tanstack/react-query';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { dataManagement, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

import { type DistinctProperty, fetchList } from '../Properties/api';

type Scope = 'all' | 'default' | 'custom';
const PAGE_SIZE = 10;

const SORT: Record<
  string,
  (a: DistinctProperty, b: DistinctProperty) => number
> = {
  name: (a, b) => a.name.localeCompare(b.name),
  displayName: (a, b) => a.displayName.localeCompare(b.displayName),
};

function DistinctEventPropsList({ eventName }: { eventName: string }) {
  const { t } = useTranslation();
  const history = useHistory();
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId!;
  const [scope, setScope] = React.useState<Scope>('all');
  const [page, setPage] = React.useState(1);
  const { data = { properties: [], total: 0 }, isPending } = useQuery({
    queryKey: ['distinct-event-props-list', siteId, eventName],
    queryFn: () => fetchList('events', eventName),
  });
  const ours = data.properties.filter((p) => p.autoCaptured);
  const yours = data.properties.filter((p) => !p.autoCaptured);
  const shown =
    scope === 'all' ? data.properties : scope === 'default' ? ours : yours;
  const { sort, onSort, sorted } = useLocalSort(shown, SORT);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns: Column<DistinctProperty>[] = [
    {
      title: t('Name'),
      key: 'name',
      width: '26%',
      sortable: true,
      render: (p) => (
        <span className="m-truncate m-dmg__mono block">{p.name}</span>
      ),
    },
    {
      title: t('Display name'),
      key: 'displayName',
      width: '24%',
      sortable: true,
      render: (p) => <span className="m-truncate block">{p.displayName}</span>,
    },
    {
      title: t('Description'),
      key: 'description',
      width: '50%',
      render: (p) => (
        <span className="m-truncate block text-content-secondary">
          {p.description || '—'}
        </span>
      ),
    },
  ];

  return (
    <PagePanel
      head={
        <>
          <span className="m-ditem__head-title">{t('Event properties')}</span>
          <div className="m-page__controls">
            <Segmented
              value={scope}
              onChange={(v) => {
                setScope(v as Scope);
                setPage(1);
              }}
              ariaLabel={t('Which properties')}
              options={[
                { value: 'all', label: t('All') },
                {
                  value: 'default',
                  label: t('OpenReplay ({{n}})', { n: ours.length }),
                },
                {
                  value: 'custom',
                  label: t('Yours ({{n}})', { n: yours.length }),
                },
              ]}
            />
          </div>
        </>
      }
    >
      {isPending ? (
        <SkeletonRows rows={4} columns={[26, 24, 50]} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={
            scope === 'custom'
              ? t('No properties of your own on this event')
              : t('No properties on this event')
          }
          hint={t(
            'Send properties with the event from your code and they will be listed here.',
          )}
        />
      ) : (
        <>
          <DataTable<DistinctProperty>
            rowKey={(p) => p.name}
            columns={columns}
            rows={rows}
            sort={sort}
            onSort={onSort}
            onRowClick={(p) =>
              history.push(
                withSiteId(
                  `${dataManagement.properties()}?view=events&property=${encodeURIComponent(p.name)}`,
                  siteId,
                ),
              )
            }
            ariaLabel={t('Event properties')}
          />
          <ListFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={shown.length}
            noun={[t('property'), t('properties')]}
            onPage={setPage}
          />
        </>
      )}
    </PagePanel>
  );
}

export default observer(DistinctEventPropsList);
