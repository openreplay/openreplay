import React from 'react';
import { Table } from 'antd';
import { observer } from 'mobx-react-lite';
import FullPagination from 'Shared/FullPagination';
import { TextEllipsis } from 'UI';
import type { Action } from './api';

function ActionsList({
  list,
  page,
  onPageChange,
  limit,
  toAction,
  isPending,
  total,
  listLen,
}: {
  list: Action[];
  page: number;
  limit: number;
  total: number;
  listLen: number;
  isPending: boolean;
  onPageChange: (page: number) => void;
  toAction: (id: string) => void;
}) {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Action, b: Action) => a.name.localeCompare(b.name),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <TextEllipsis maxWidth={'400px'} text={text} />,
    },
    {
      title: 'Complexity',
      dataIndex: 'complexity',
      key: 'complexity',
      sorter: (a: any, b: any) => (a.complexity ?? '').localeCompare(b.complexity ?? ''),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
    },
    {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: (a: any, b: any) => (a.updatedAt ?? 0) - (b.updatedAt ?? 0),
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: number) =>
        text ? new Date(text).toLocaleDateString() : '—',
    },
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={list}
        pagination={false}
        rowKey="id"
        onRow={(record) => ({
          onClick: () => toAction(record.id),
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
        entity={'actions'}
      />
    </>
  );
}

export default observer(ActionsList);
