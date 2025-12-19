import React from 'react';
import { Table, Dropdown, Button } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { Filter } from 'lucide-react';
import FilterSelection from 'Shared/Filters/FilterSelection';
import UnifiedFilterList from 'Shared/Filters/FilterList/UnifiedFilterList';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import ColumnsModal from 'Components/DataManagement/Activity/ColumnsModal';
import FullPagination from 'Shared/FullPagination';
import { diffIfRecent } from 'App/date';
import { getSortingName } from '@/mstore/types/Analytics/User';
import { CountryFlag } from 'UI';
import NameAvatar from 'Shared/NameAvatar';
import withPageTitle from '@/components/hocs/withPageTitle';

function UsersList({
  toUser,
  query,
}: {
  toUser: (id: string) => void;
  query: string;
}) {
  const { analyticsStore, filterStore } = useStore();
  const [editCols, setEditCols] = React.useState(false);
  const [hiddenCols, setHiddenCols] = React.useState<any[]>([]);
  const page = analyticsStore.usersPayloadFilters.page;
  const limit = analyticsStore.usersPayloadFilters.limit;
  const total = analyticsStore.users.total;
  const users = analyticsStore.users.users;

  const allFilterOptions = filterStore
    .getScopedCurrentProjectFilters(['users'])
    .filter((f) => !f.isEvent);
  const activeFilters = analyticsStore.usersPayloadFilters.filters.map(
    (f) => f.name,
  );

  React.useEffect(() => {
    analyticsStore.fetchUsers(query);
  }, [
    analyticsStore.usersPayloadFilters,
    analyticsStore.usersPayloadFilters.filters,
    query,
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
    if (!sorter.field) {
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
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
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
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
      render: (_: any, record: any) => (
        <div className={'link'}>{record.userId ? record.userId : 'N/A'}</div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'userLocation',
      key: 'userLocation',
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
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
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
      render: (_: any, record: any) => diffIfRecent(record.createdAt),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      showSorterTooltip: { target: 'full-header' },
      sorter: true,
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
      <div className="flex flex-col gap-2 px-4 py-2">
        {/* 1.23 -- <span>Show by</span>*/}
        {/*<Segmented*/}
        {/*  size={'small'}*/}
        {/*  options={[*/}
        {/*    { label: 'Profiles', value: 'profiles' },*/}
        {/*    { label: 'Company', value: 'company' },*/}
        {/*  ]}*/}
        {/*/>*/}
        <div>
          <FilterSelection
            filters={allFilterOptions}
            activeFilters={activeFilters}
            onFilterClick={onAddFilter}
          >
            <Button
              icon={<Filter size={16} strokeWidth={1} />}
              type="default"
              size={'small'}
              className="btn-add-filter"
            >
              Filters
            </Button>
          </FilterSelection>
        </div>
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
          rowClassName={'cursor-pointer'}
          dataSource={users}
          columns={shownCols}
          onChange={(a1, a2, sorter) => {
            onColumnSort(sorter);
          }}
          rowKey={(record) => record.userId}
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
