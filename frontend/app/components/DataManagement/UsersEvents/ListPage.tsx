import React from 'react';
import { numberWithCommas } from 'App/utils';
import FilterSelection from "Shared/Filters/FilterSelection/FilterSelection";
import User from './data/User';
import { Pagination } from 'UI';
import { Segmented, Input, Table, Button, Dropdown, Tabs } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { TabsProps } from ".store/antd-virtual-7db13b4af6/package";
import { useHistory } from 'react-router-dom';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { withSiteId, dataManagement } from "App/routes";
import { Filter } from "lucide-react";

const customTabBar: TabsProps['renderTabBar'] = (props, DefaultTabBar) => (
  <DefaultTabBar {...props} className="!mb-0" />
);

function ListPage() {
  const { projectsStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const toUser = (id: string) => history.push(withSiteId(dataManagement.userPage(id), siteId));
  const [view, setView] = React.useState('users');

  const views = [
    {
      key: 'users',
      label: <div className={'text-lg font-medium'}>Users</div>,
      content: <div>placeholder</div>,
    },
    {
      key: 'events',
      label: <div className={'text-lg font-medium'}>Events</div>,
      content: <div>placeholder</div>,
    },
  ];
  return (
    <div className="flex flex-col gap-4 p-4 pt-2 rounded-lg border bg-white">
      <div className={'flex items-center justify-between border-b'}>
        <Tabs
          type={'line'}
          defaultActiveKey={'users'}
          activeKey={view}
          style={{ borderBottom: 'none' }}
          onChange={(key) => setView(key)}
          items={views}
          renderTabBar={customTabBar}
        />
        <div className="flex items-center gap-2">
          <Button type={'text'}>Docs</Button>
          <Input.Search placeholder={'Name, email, ID'} />
        </div>
      </div>
      {view === 'users' ? <UsersList toUser={toUser} /> : null}
    </div>
  );
}

function UsersList({ toUser }: { toUser: (id: string) => void }) {
  const [editCols, setEditCols] = React.useState(false);
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
    })
  ]

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
  const excludeFilterKeys = []
  const excludeCategory = []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
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
            className='btn-add-filter'
          >
            Filters
          </Button>
        </FilterSelection>
      </div>
      <Table
        onRow={(record) => ({
          onClick: () => toUser(record.userId),
        })}
        pagination={false}
        rowClassName={'cursor-pointer'}
        dataSource={testUsers}
        columns={columns}
      />
      <div className="flex items-center justify-between px-4 py-3 shadow-sm w-full bg-white rounded-lg mt-2">
        <div>
          {'Showing '}
          <span className="font-medium">{(page - 1) * limit + 1}</span>
          {' to '}
          <span className="font-medium">
            {(page - 1) * limit + list.length}
          </span>
          {' of '}
          <span className="font-medium">{numberWithCommas(total)}</span>
          {' users.'}
        </div>
        <Pagination
          page={page}
          total={total}
          onPageChange={onPageChange}
          limit={limit}
          debounceRequest={500}
        />
      </div>
    </div>
  );
}

export default observer(ListPage);
