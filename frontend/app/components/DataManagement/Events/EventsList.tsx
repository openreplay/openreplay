import React from 'react';
import { Table } from 'antd';
import { observer } from 'mobx-react-lite';
import FullPagination from 'Shared/FullPagination';
import { TextEllipsis } from 'UI';
import type { DistinctEvent } from './api';

function EventsList({
  list,
  page,
  onPageChange,
  limit,
  toEvent,
  isPending,
  total,
  listLen,
}: {
  list: DistinctEvent[];
  page: number;
  limit: number;
  total: number;
  listLen: number;
  isPending: boolean;
  onPageChange: (page: number) => void;
  toEvent: (name: string) => void;
}) {
  const numberFormatter = Intl.NumberFormat(navigator.language || 'en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  });
  const columns = [
    {
      title: 'Event Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
      sorter: (a, b) => a.displayName.localeCompare(b.displayName),
      render: (text: string) => (
        <TextEllipsis className="link" maxWidth={'185px'} text={text} />
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <TextEllipsis maxWidth={'400px'} text={text} />,
    },
    {
      title: '30 Day Volume',
      dataIndex: 'count',
      key: 'count',
      sorter: (a: any, b: any) => a.count - b.count,
      render: (text: string) => (
        <span>{numberFormatter.format(Number(text))}</span>
      ),
    },
  ];
  return (
    <>
      <Table
        columns={columns}
        dataSource={list}
        pagination={false}
        onRow={(record) => ({
          onClick: () => toEvent(record.name),
        })}
        rowHoverable
        rowClassName={'cursor-pointer'}
        loading={isPending}
      />
      <FullPagination
        page={page}
        limit={limit}
        total={total}
        listLen={listLen}
        onPageChange={onPageChange}
        entity={'events'}
      />
    </>
  );
}

export default observer(EventsList);
