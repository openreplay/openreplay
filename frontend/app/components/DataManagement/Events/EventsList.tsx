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
  const numberFormatter = Intl.NumberFormat(navigator.language || 'en-US');

  const columns = [
    {
      title: 'Event Name',
      dataIndex: 'name',
      key: 'name',
      showSorterTooltip: { target: 'full-header' },
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: string) => <div className="link">{text}</div>,
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
      render: (text: string) => <TextEllipsis maxWidth={'400px'} text={text} />,
    },
    {
      title: '30 Day Volume',
      dataIndex: 'count',
      key: 'count',
      showSorterTooltip: { target: 'full-header' },
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
