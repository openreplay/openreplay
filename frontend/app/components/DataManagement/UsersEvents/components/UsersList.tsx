import withPageTitle from '@/components/hocs/withPageTitle';
import { getSortingName } from '@/mstore/types/Analytics/User';
import { MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown, Empty, Table } from 'antd';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { diffIfRecent } from 'App/date';
import { useStore } from 'App/mstore';
import ColumnsModal from 'Components/DataManagement/Activity/ColumnsModal';
import { CountryFlag } from 'UI';

import FilterListHeader from 'Shared/Filters/FilterList/FilterListHeader';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import FilterSelection from 'Shared/Filters/FilterSelection';
import FullPagination from 'Shared/FullPagination';
import NameAvatar from 'Shared/NameAvatar';

function UsersList({
  toUser,
  query,
  propName,
}: {
  toUser: (id: string) => void;
  query: string;
  propName?: string;
}) {
  const { t } = useTranslation();
  const { analyticsStore, filterStore } = useStore();
  const [editCols, setEditCols] = React.useState(false);
  const [hiddenCols, setHiddenCols] = React.useState<any[]>([]);
  const page = analyticsStore.usersPayloadFilters.page;
  const limit = analyticsStore.usersPayloadFilters.limit;
  const total = analyticsStore.users.total;
  const users = analyticsStore.users.users;

  const emptyState = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div className="flex flex-col items-center gap-2 pt-2">
          <div className="text-base font-medium">{t('No users')}</div>
          <div className="text-disabled-text max-w-md">
            {t(
              'Users are identified from tracked sessions via tracker or OpenReplay SDK methods.',
            )}
          </div>
        </div>
      }
    />
  );

  const allFilterOptions = filterStore
    .getScopedCurrentProjectFilters(['users'])
    .filter((f) => !f.isEvent);
  const activeFilters = analyticsStore.usersPayloadFilters.filters.map(
    (f) => f.name,
  );

  React.useEffect(() => {
    analyticsStore.fetchUsers(query, propName);
  }, [
    analyticsStore.usersPayloadFilters,
    analyticsStore.usersPayloadFilters.filters,
    query,
    propName,
  ]);

  const dropdownItems = [
    {
      label: 'Show/Hide Columns',
      key: 'edit-columns',
      onClick: () => setTimeout(() => setEditCols(true), 1),
    },
  ];

  const onColumnSort = (
    sorter:
      | {
          field: string;
          order: 'ascend' | 'descend';
        }
      | undefined,
  ) => {
    if (!sorter || !sorter.field) {
      analyticsStore.editUsersPayload({
        sortOrder: 'desc',
        sortBy: '$created_at',
      });
    } else {
      const fieldName = sorter.field;
      analyticsStore.editUsersPayload({
        sortBy: getSortingName(fieldName),
        sortOrder: sorter.order === 'ascend' ? 'asc' : 'desc',
      });
    }
  };
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      showSorterTooltip: false,
      render: (_: any, record: any) => {
        return (
          <div className="flex items-center gap-2">
            {record.avatarUrl ? (
              <img
                src={record.avatarUrl}
                alt="avatar"
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <NameAvatar name={record.name || 'N/A'} size={28} />
            )}
            <span>{record.name || 'N/A'}</span>
          </div>
        );
      },
    },
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      sorter: true,
      showSorterTooltip: false,
      render: (_: any, record: any) => (
        <div className={'link'}>{record.userId ? record.userId : 'N/A'}</div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'userLocation',
      key: 'userLocation',
      sorter: true,
      showSorterTooltip: false,
      render: (_: any, record: any) => (
        <div className={'flex items-center gap-2'}>
          <CountryFlag
            userCity={record.city}
            userState={record.state}
            country={record.country}
          />
          <div>{record.userLocation}</div>
        </div>
      ),
    },
    {
      title: 'Last Seen',
      dataIndex: 'lastSeen',
      key: 'lastSeen',
      sorter: true,
      showSorterTooltip: false,
      render: (_: any, record: any) => diffIfRecent(record.createdAt),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      showSorterTooltip: false,
      render: (_: any, record: any) => diffIfRecent(record.createdAt),
    },
    {
      title: (
        <Dropdown
          menu={{ items: dropdownItems }}
          trigger={'click'}
          placement={'bottomRight'}
        >
          <div className={'cursor-pointer'}>
            <MoreOutlined />
          </div>
        </Dropdown>
      ),
      dataIndex: '$__opts__$',
      key: '$__opts__$',
      width: 50,
    },
  ];

  const onPageChange = (page: number) => {
    analyticsStore.editUsersPayload({ page });
  };

  const onAddFilter = (f: any) => {
    analyticsStore.addUserFilter(f);
  };
  const onUpdateFilter = (index: number, f: any) => {
    analyticsStore.updateUserFilter(index, f);
    analyticsStore.fetchUsers(query);
  };
  const onRemoveFilter = (index: number) => {
    analyticsStore.removeUserFilter(index);
  };

  const shownCols = columns.map((col) => ({
    ...col,
    hidden: hiddenCols.includes(col.key),
  }));
  const onUpdateVisibleCols = (cols: string[]) => {
    setHiddenCols((_) => {
      return columns
        .map((col) =>
          cols.includes(col.key) || col.key === '$__opts__$' ? null : col.key,
        )
        .filter(Boolean);
    });
    setEditCols(false);
  };
  return (
    <div className="flex flex-col">
      <div className="flex flex-col px-4 py-2">
        {/* 1.23 -- <span>Show by</span>*/}
        {/*<Segmented*/}
        {/*  size={'small'}*/}
        {/*  options={[*/}
        {/*    { label: 'Profiles', value: 'profiles' },*/}
        {/*    { label: 'Company', value: 'company' },*/}
        {/*  ]}*/}
        {/*/>*/}
        <FilterListHeader
          title="Filters"
          filterSelection={
            <FilterSelection
              filters={allFilterOptions}
              activeFilters={activeFilters}
              onFilterClick={onAddFilter}
            >
              <Button type="default" size="small">
                <div className="flex items-center gap-1">
                  <Plus size={16} strokeWidth={1} />
                  <span>Add</span>
                </div>
              </Button>
            </FilterSelection>
          }
        />
        <UnifiedFilterList
          title="Filters"
          filters={analyticsStore.usersPayloadFilters.filters}
          className="mt-2"
          isDraggable={false}
          showIndices={false}
          handleRemove={onRemoveFilter}
          handleUpdate={onUpdateFilter}
          handleAdd={onAddFilter}
          scope="users"
        />
      </div>

      <div className={'relative'}>
        {editCols ? (
          <ColumnsModal
            columns={shownCols.filter((col) => col.key !== '$__opts__$')}
            onSelect={onUpdateVisibleCols}
            hiddenCols={hiddenCols}
            topOffset={'top-24 -mt-4'}
            onClose={() => setEditCols(false)}
          />
        ) : null}
        <Table
          onRow={(record) => ({
            onClick: () => toUser(record.userId),
          })}
          loading={analyticsStore.loading}
          pagination={false}
          scroll={{ x: 'max-content' }}
          rowClassName={'cursor-pointer'}
          dataSource={users}
          columns={shownCols}
          onChange={(a1, a2, sorter) => {
            onColumnSort(sorter);
          }}
          rowKey={(record) => record.userId}
          locale={{
            emptyText: analyticsStore.loading ? null : emptyState,
          }}
        />
      </div>
      <FullPagination
        page={page}
        limit={limit}
        total={total}
        listLen={users.length}
        onPageChange={onPageChange}
        entity={'users'}
      />
    </div>
  );
}

export default withPageTitle('People')(observer(UsersList));
