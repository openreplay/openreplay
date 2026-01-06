import React from 'react';
import { Table } from 'antd';
import { observer } from 'mobx-react-lite';
import FullPagination from 'Shared/FullPagination';

function EventsList({ toEvent }: { toEvent?: (id: string) => void }) {
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

  const list = [];
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

export default observer(EventsList);
