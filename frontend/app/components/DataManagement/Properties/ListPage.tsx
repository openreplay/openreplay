import withPageTitle from '@/components/hocs/withPageTitle';
import { useLocalSort } from '@/lib/use-local-sort';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DisplayShell } from '@/ui/filters/DisplayMenu';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { SearchField } from '@/ui/inputs/SearchField';
import { Switch } from '@/ui/inputs/switch';
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
import { useHistory, useLocation } from 'App/routing';

import '../data-management.css';
import { DM_DOCS, HiddenMark, compact } from '../shared';
import PropertyPage from './PropertyPage';
import { type DistinctProperty, fetchList } from './api';

type View = 'users' | 'events';

const PAGE_SIZE = 10;
const SHOW_HIDDEN_KEY = 'data-management-properties-show-hidden';
const readShowHidden = () => {
  try {
    return localStorage.getItem(SHOW_HIDDEN_KEY) !== 'false';
  } catch {
    return true;
  }
};

const volumeOf = (view: View, p: DistinctProperty) =>
  (view === 'users' ? p.usersCount : p.count) ?? 0;

function ListPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const view: View = params.get('view') === 'events' ? 'events' : 'users';
  const picked = params.get('property');
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showHidden, setShowHidden] = React.useState(readShowHidden);
  const toggleHidden = (v: boolean) => {
    setShowHidden(v);
    setPage(1);
    try {
      localStorage.setItem(SHOW_HIDDEN_KEY, String(v));
    } catch {}
  };
  const {
    data = { properties: [], total: 0 },
    isPending,
    refetch,
  } = useQuery({
    queryKey: ['props-list', siteId, view],
    queryFn: () => fetchList(view),
  });

  const q = query.trim().toLowerCase();
  const visible = React.useMemo(
    () =>
      data.properties
        .filter((p) => showHidden || p.status === 'visible')
        .filter(
          (p) =>
            !q ||
            p.name.toLowerCase().includes(q) ||
            p.displayName.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q),
        )
        .sort((a, b) => b.createdAt - a.createdAt),
    [data.properties, showHidden, q],
  );
  const sorters = React.useMemo(
    () => ({
      name: (a: DistinctProperty, b: DistinctProperty) =>
        a.name.localeCompare(b.name),
      displayName: (a: DistinctProperty, b: DistinctProperty) =>
        a.displayName.localeCompare(b.displayName),
      count: (a: DistinctProperty, b: DistinctProperty) =>
        volumeOf(view, a) - volumeOf(view, b),
    }),
    [view],
  );
  const { sort, onSort, sorted } = useLocalSort(visible, sorters);
  const rows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(location.search);
    Object.entries(next).forEach(([k, v]) =>
      v == null ? p.delete(k) : p.set(k, v),
    );
    history.push({ search: p.toString() });
  };

  if (picked) {
    const back = () => go({ property: null });
    const prop = data.properties.find((p) => p.name === picked);
    const backLabel =
      view === 'users' ? t('User properties') : t('Event properties');
    if (isPending || !prop)
      return (
        <PageCard back={{ label: backLabel, onClick: back }} title={picked}>
          {isPending ? (
            <SkeletonRows rows={4} columns={[30, 70]} />
          ) : (
            <EmptyState
              art="properties"
              title={t('Property {{name}} not found', { name: picked })}
              action={<Button onClick={back}>{t('Back to properties')}</Button>}
            />
          )}
        </PageCard>
      );
    return (
      <PropertyPage
        source={view}
        property={prop}
        back={{ label: backLabel, onClick: back }}
        refetchList={refetch}
      />
    );
  }

  const columns: Column<DistinctProperty>[] = [
    {
      title: view === 'users' ? t('Property') : t('Name'),
      key: 'name',
      width: '24%',
      sortable: true,
      render: (p) => (
        <span className="m-dmg__identity-cell">
          <span className="m-truncate m-dmg__mono">{p.name}</span>
          {p.status === 'hidden' && <HiddenMark />}
        </span>
      ),
    },
    {
      title: t('Display name'),
      key: 'displayName',
      width: '20%',
      sortable: true,
      render: (p) => <span className="m-truncate block">{p.displayName}</span>,
    },
    {
      title: t('Description'),
      key: 'description',
      width: '40%',
      render: (p) =>
        p.description ? (
          <Tooltip title={p.description} delay={400}>
            <span className="m-truncate block text-content-secondary">
              {p.description}
            </span>
          </Tooltip>
        ) : (
          <span className="text-content-disabled">—</span>
        ),
    },
    {
      title: view === 'users' ? t('# Users') : t('30-day volume'),
      key: 'count',
      width: '16%',
      align: 'right',
      sortable: true,
      render: (p) => (
        <span className="m-dmg__mono">{compact.format(volumeOf(view, p))}</span>
      ),
    },
  ];

  return (
    <PageCard
      title={t('Properties')}
      subtitle={t('Attributes captured on users and events.')}
      actions={
        <>
          <SearchField
            placeholder={
              view === 'users'
                ? t('Search user properties')
                : t('Search event properties')
            }
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
        <>
          <FilterStrip
            label={t('Which properties')}
            items={[
              { key: 'users', label: t('User properties') },
              { key: 'events', label: t('Event properties') },
            ]}
            selected={[view]}
            onSelect={(v) => {
              setPage(1);
              go({ view: v, property: null });
            }}
          />
          <div className="m-page__controls">
            <DisplayShell
              changeCount={showHidden ? 0 : 1}
              onReset={() => toggleHidden(true)}
              rows={[
                {
                  id: 'hidden',
                  label: t('Show hidden properties'),
                  control: (
                    <Switch
                      checked={showHidden}
                      onCheckedChange={toggleHidden}
                      aria-label={t('Show hidden properties')}
                    />
                  ),
                },
              ]}
            />
          </div>
        </>
      }
    >
      {isPending ? (
        <SkeletonRows rows={5} columns={[24, 20, 40, 16]} />
      ) : data.properties.length === 0 ? (
        <EmptyState
          art="properties"
          title={t('No properties yet')}
          hint={
            view === 'users'
              ? t(
                  'What your code attaches to a person: plan, company, role, one key at a time. Send one and it is catalogued here.',
                )
              : t(
                  'What an event carries with it: the page, the element, the value. The first events bring the first keys.',
                )
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          art="search"
          title={t('No properties match')}
          hint={t('Clear the search, or show the hidden ones too.')}
          action={
            <Button
              onClick={() => {
                setQuery('');
                setShowHidden(true);
              }}
            >
              {t('Show all properties')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable<DistinctProperty>
            rowKey={(p) => p.name}
            columns={columns}
            rows={rows}
            sort={sort}
            onSort={onSort}
            onRowClick={(p) => go({ property: p.name })}
            ariaLabel={t('Properties')}
          />
          <ListFooter
            page={page}
            pageSize={PAGE_SIZE}
            total={visible.length}
            noun={[t('property'), t('properties')]}
            onPage={setPage}
          />
        </>
      )}
    </PageCard>
  );
}

export default withPageTitle('Properties')(
  withPermissions(['DATA_MANAGEMENT'], '', false, false)(observer(ListPage)),
);
