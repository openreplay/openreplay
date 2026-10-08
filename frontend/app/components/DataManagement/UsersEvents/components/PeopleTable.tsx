import { getSortingName } from '@/mstore/types/Analytics/User';
import type User from '@/mstore/types/Analytics/User';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable, type TableSort } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ListFooter } from '@/ui/layout/ListFooter';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';

import '../../data-management.css';
import { PersonAvatar, Where } from './PersonAvatar';

export const PEOPLE_COLUMNS = [
  'name',
  'userId',
  'userLocation',
  'lastSeen',
  'createdAt',
] as const;
type ColumnKey = (typeof PEOPLE_COLUMNS)[number];

const DEFAULT_SORT = '$created_at';

interface Props {
  query: string;
  propName?: string;
  hidden?: readonly string[];
  onOpen: (userId: string, e: React.MouseEvent) => void;
  empty: React.ReactNode;
}

function PeopleTable({ query, propName, hidden = [], onOpen, empty }: Props) {
  const { t } = useTranslation();
  const { analyticsStore, settingsStore } = useStore();
  const timezone = settingsStore.sessionSettings.timezone?.value;
  const { page, limit, sortBy, sortOrder } = analyticsStore.usersPayloadFilters;
  const { total, users } = analyticsStore.users;

  React.useEffect(() => {
    void analyticsStore.fetchUsers(query, propName);
  }, [
    analyticsStore.usersPayloadFilters,
    analyticsStore.usersPayloadFilters.filters,
    query,
    propName,
  ]);

  const sortColumn = PEOPLE_COLUMNS.find((c) => getSortingName(c) === sortBy);
  const tableSort: TableSort | null =
    sortBy === DEFAULT_SORT && sortOrder === 'desc'
      ? null
      : sortColumn
        ? { key: sortColumn, desc: sortOrder === 'desc' }
        : null;
  const onSort = (key: string | null, desc: boolean) =>
    analyticsStore.editUsersPayload(
      key
        ? { sortBy: getSortingName(key), sortOrder: desc ? 'desc' : 'asc' }
        : { sortBy: DEFAULT_SORT, sortOrder: 'desc' },
    );

  const all: Record<ColumnKey, Column<User>> = {
    name: {
      title: t('Name'),
      key: 'name',
      width: '28%',
      sortable: true,
      render: (u) => (
        <span className="m-dmg__identity-cell">
          <PersonAvatar userId={u.userId} avatarUrl={u.avatarUrl} />
          <span className="m-truncate">
            {u.name && u.name !== 'N/A' ? u.name : u.email || u.userId}
          </span>
        </span>
      ),
    },
    userId: {
      title: t('User ID'),
      key: 'userId',
      width: '26%',
      sortable: true,
      render: (u) => (
        <span className="m-truncate m-dmg__mono block">{u.userId}</span>
      ),
    },
    userLocation: {
      title: t('Location'),
      key: 'userLocation',
      width: '20%',
      sortable: true,
      render: (u) => (
        <Where city={u.city} state={u.state} country={u.country} />
      ),
    },
    lastSeen: {
      title: t('Last seen'),
      key: 'lastSeen',
      width: '13%',
      sortable: true,
      render: (u) =>
        u.lastSeen ? (
          <RelativeTime at={u.lastSeen} timezone={timezone} />
        ) : (
          <span className="text-content-disabled">—</span>
        ),
    },
    createdAt: {
      title: t('Created'),
      key: 'createdAt',
      width: '13%',
      sortable: true,
      render: (u) => <RelativeTime at={u.createdAt} timezone={timezone} />,
    },
  };
  const columns = PEOPLE_COLUMNS.filter((k) => !hidden.includes(k)).map(
    (k) => all[k],
  );

  if (analyticsStore.loading && users.length === 0)
    return <SkeletonRows rows={5} columns={[28, 26, 20, 13, 13]} />;
  if (users.length === 0) return <>{empty}</>;
  return (
    <>
      <DataTable<User>
        rowKey={(u) => u.userId}
        columns={columns}
        rows={users}
        sort={tableSort}
        onSort={onSort}
        onRowClick={(u, e) => onOpen(u.userId, e)}
        ariaLabel={t('People')}
      />
      <ListFooter
        page={page}
        pageSize={limit}
        total={total}
        noun={[t('person'), t('people')]}
        onPage={(p) => analyticsStore.editUsersPayload({ page: p })}
      />
    </>
  );
}

export default observer(PeopleTable);

export const peopleColumnLabels = (t: (s: string) => string) => ({
  name: t('Name'),
  userId: t('User ID'),
  userLocation: t('Location'),
  lastSeen: t('Last seen'),
  createdAt: t('Created'),
});

/** Fallback for `EmptyState` when nobody is listed. */
export function NoPeople({ filtered }: { filtered: boolean }) {
  const { t } = useTranslation();
  return filtered ? (
    <EmptyState
      art="search"
      title={t('No people match')}
      hint={t('Loosen a rule or clear the search to see everyone.')}
    />
  ) : (
    <EmptyState
      art="people"
      title={t('No people yet')}
      hint={t(
        'A session becomes a person once your code says who it is. One call to setUserID, and they are listed here with everything they did.',
      )}
    />
  );
}
