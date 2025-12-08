import React from 'react';
import FilterSelection from 'Shared/Filters/FilterSelection/FilterSelection';
import { Table, Button, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { Filter } from 'lucide-react';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import ColumnsModal from 'Components/DataManagement/Activity/ColumnsModal';
import FullPagination from 'Shared/FullPagination';
import { resentOrDate } from 'App/date';

function UsersList({
  toUser,
  query,
}: {
  toUser: (id: string) => void;
  query: string;
}) {
  const { analyticsStore } = useStore();
  const [editCols, setEditCols] = React.useState(false);
  const [hiddenCols, setHiddenCols] = React.useState<any[]>([]);
  const page = analyticsStore.usersPayloadFilters.page;
  const limit = analyticsStore.usersPayloadFilters.limit;
  const total = analyticsStore.users.total;
  const users = analyticsStore.users.users;

  React.useEffect(() => {
    analyticsStore.fetchUsers(query);
  }, [analyticsStore.usersPayloadFilters, query]);

  const dropdownItems = [
    {
      label: 'Show/Hide Columns',
      key: 'edit-columns',
      onClick: () => setTimeout(() => setEditCols(true), 1),
    },
  ];
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Email',
      dataIndex: 'userId',
      key: 'userId',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.userId.localeCompare(b.userId),
    },
    {
      title: 'Distinct ID',
      dataIndex: 'distinctId',
      key: 'distinctId',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.distinctId[0].localeCompare(b.distinctId[0]),
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
      render: (_: any, record: any) => resentOrDate(record.updatedAt),
    },
    {
      title: (
        <Dropdown
          menu={{ items: dropdownItems }}
          trigger={['click']}
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

  const onAddFilter = () => console.log('add filter');
  const excludeFilterKeys = [];
  const excludeCategory = [];

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
      <div className="flex items-center gap-2 px-4 pb-2">
        {/* 1.23 -- <span>Show by</span>*/}
        {/*<Segmented*/}
        {/*  size={'small'}*/}
        {/*  options={[*/}
        {/*    { label: 'Profiles', value: 'profiles' },*/}
        {/*    { label: 'Company', value: 'company' },*/}
        {/*  ]}*/}
        {/*/>*/}
        <FilterSelection
          mode={'filters'}
          filter={undefined}
          onFilterClick={onAddFilter}
          disabled={false}
          excludeFilterKeys={excludeFilterKeys}
          excludeCategory={excludeCategory}
          isLive={false}
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
      <div className={'relative'}>
        {editCols ? (
          <OutsideClickDetectingDiv onClickOutside={() => setEditCols(false)}>
            <ColumnsModal
              columns={shownCols.filter((col) => col.key !== '$__opts__$')}
              onSelect={onUpdateVisibleCols}
              hiddenCols={hiddenCols}
              topOffset={'top-24 -mt-4'}
            />
          </OutsideClickDetectingDiv>
        ) : null}
        <Table
          onRow={(record) => ({
            onClick: () => toUser(record.userId),
          })}
          pagination={false}
          rowClassName={'cursor-pointer'}
          dataSource={users}
          columns={shownCols}
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

export default observer(UsersList);
