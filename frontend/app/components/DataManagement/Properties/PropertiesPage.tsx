import React from 'react';
import FullPagination from 'Shared/FullPagination';
import { Input, Table } from 'antd';
import Tabs from 'Shared/Tabs';
import { list } from "../Activity/ActivityPage";

function PropertiesPage() {
  const [query, setQuery] = React.useState('');
  const [activeView, setActiveView] = React.useState('properties');
  const views = [
    {
      key: 'user-props',
      label: <div className={'text-lg font-medium'}>User Properties</div>,
    },
    {
      key: 'events-props',
      label: <div className={'text-lg font-medium'}>Event Properties</div>,
    },
  ];
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border bg-white mx-auto"
      style={{ maxWidth: 1360 }}
    >
      <div className={'flex items-center justify-between border-b px-4 pt-2 '}>
        <Tabs items={views} onChange={setActiveView} activeKey={activeView} />
        <Input.Search
          size={'small'}
          placeholder={'Name, email, ID'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {activeView === 'user-props' ? <UserPropsList /> : <EventPropsList />}
    </div>
  );
}

function UserPropsList() {
  const columns = [
    {
      title: 'Name',
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
      title: 'Example Value',
      dataIndex: 'exampleValue',
      key: 'exampleValue',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.exampleValue.localeCompare(b.exampleValue),
    },
    {
      title: '# of Queries',
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
      <Table columns={columns} dataSource={list} pagination={false} />
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

function EventPropsList() {
  const columns = [
    {
      title: 'Name',
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
      title: 'Example Value',
      dataIndex: 'exampleValue',
      key: 'exampleValue',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.exampleValue.localeCompare(b.exampleValue),
    },
    {
      title: '# of Events',
      dataIndex: 'totalVolume',
      key: 'totalVolume',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a, b) => a.totalVolume.localeCompare(b.totalVolume),
    },
  ];
  const page = 1;
  const total = 100;
  const onPageChange = (page: number) => {};
  const limit = 10;
  return (
    <div>
      <Table columns={columns} dataSource={list} pagination={false} />
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
