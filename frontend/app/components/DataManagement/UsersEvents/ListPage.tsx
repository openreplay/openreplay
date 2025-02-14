import React from 'react';
import FilterSelection from 'Shared/Filters/FilterSelection/FilterSelection';
import User from './data/User';
import { Input, Table, Button, Dropdown } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { withSiteId, dataManagement } from 'App/routes';
import { Filter, Album } from 'lucide-react';
import { list } from '../Activity/Page';
import OutsideClickDetectingDiv from 'Shared/OutsideClickDetectingDiv';
import ColumnsModal from 'Components/DataManagement/Activity/ColumnsModal';
import FullPagination from 'Shared/FullPagination';
import Tabs from 'Shared/Tabs'

function ListPage() {
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const toUser = (id: string) =>
    history.push(withSiteId(dataManagement.userPage(id), siteId));
  const toEvent = (id: string) =>
    history.push(withSiteId(dataManagement.eventPage(id), siteId));
  const [view, setView] = React.useState('users');

  const views = [
    {
      key: 'users',
      label: <div className={'text-lg font-medium'}>Users</div>,
    },
    {
      key: 'events',
      label: <div className={'text-lg font-medium'}>Events</div>,
    },
  ];
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4 pt-2 '}>
        <Tabs
          activeKey={view}
          onChange={(key) => setView(key)}
          items={views}
        />
        <div className="flex items-center gap-2">
          <Button type={'text'} icon={<Album size={14} />}>
            Docs
          </Button>
          <Input.Search size={'small'} placeholder={'Name, email, ID'} />
        </div>
      </div>
      {view === 'users' ? <UsersList toUser={toUser} /> : <EventsList toEvent={toEvent} />}
    </div>
  );
}

function EventsList({ toEvent }: { toEvent: (id: string) => void }) {
  const columns = [
    {
      title: 'Event Name',
      dataIndex: 'name',
      key: 'name',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.description.localeCompare(b.description),
    },
    {
      title: '30 Day Volume',
      dataIndex: 'monthVolume',
      key: 'monthVolume',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.monthVolume.localeCompare(b.monthVolume),
    },
    {
      title: '30 Day Queries',
      dataIndex: 'monthQuery',
      key: 'monthQuery',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.monthQuery.localeCompare(b.monthQuery),
    },
  ];
  const page = 1;
  const total = 100;
  const onPageChange = (page: number) => {};
  const limit = 10;
  return (
    <div>
      <Table
        columns={columns}
        dataSource={list}
        pagination={false}
        onRow={(record) => ({
          onClick: () => toEvent(record.eventId),
        })}
      />
      <FullPagination
        page={page}
        limit={limit}
        total={total}
        listLen={list.length}
        onPageChange={onPageChange}
        entity={'events'}
      />
    </div>
  );
}

function UsersList({ toUser }: { toUser: (id: string) => void }) {
  const [editCols, setEditCols] = React.useState(false);
  const [hiddenCols, setHiddenCols] = React.useState([]);
  const testUsers = [
    new User({
      name: 'test123',
      userId: 'email@id.com',
      distinctId: ['123123123'],
      userLocation: 'NY',
      cohorts: ['test'],
      properties: {
        email: 'sad;jsadk',
      },
      updatedAt: Date.now(),
    }),
    new User({
      name: 'test123',
      userId: 'email@id.com',
      distinctId: ['123123123'],
      userLocation: 'NY',
      cohorts: ['test'],
      properties: {
        email: 'sad;jsadk',
      },
      updatedAt: Date.now(),
    }),
    new User({
      name: 'test123',
      userId: 'email@id.com',
      distinctId: ['123123123123'],
      userLocation: 'NY',
      cohorts: ['test'],
      properties: {
        email: 'sad;jsadk',
      },
      updatedAt: Date.now(),
    }),
    new User({
      name: 'test123',
      userId: 'email@id.com',
      distinctId: ['1231214143123'],
      userLocation: 'NY',
      cohorts: ['test'],
      properties: {
        email: 'sad;jsadk',
      },
      updatedAt: Date.now(),
    }),
  ];

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

  const page = 1;
  const total = 10;
  const onPageChange = (page: number) => {};
  const limit = 10;
  const list = [];

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
          cols.includes(col.key) || col.key === '$__opts__$' ? null : col.key
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
          dataSource={testUsers}
          columns={shownCols}
        />
      </div>
      <FullPagination
        page={page}
        limit={limit}
        total={total}
        listLen={list.length}
        onPageChange={onPageChange}
        entity={'users'}
      />
    </div>
  );
}

export default observer(ListPage);
