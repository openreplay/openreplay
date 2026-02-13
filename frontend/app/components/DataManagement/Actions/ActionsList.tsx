import { Table, type TableProps } from 'antd';
import type { SorterResult } from 'antd/es/table/interface';
import { observer } from 'mobx-react-lite';
import React from 'react';

import { TextEllipsis } from 'UI';

import FullPagination from 'Shared/FullPagination';

import type { Action } from './api';

type SortBy = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const columnKeyToSortBy: Record<string, SortBy> = {
  name: 'name',
  updatedAt: 'updatedAt',
};

function ActionsList({
  list,
  page,
  onPageChange,
  onSortChange,
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
  onSortChange: (field: SortBy, order: SortOrder) => void;
  toAction: (id: string) => void;
}) {
  const columns: TableProps<Action>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true,
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
    },
    {
      title: 'Updated At',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      sorter: true,
      showSorterTooltip: false,
      className: 'cursor-pointer!',
      render: (text: number) =>
        text ? new Date(text).toLocaleDateString() : '—',
    },
  ];

  const handleTableChange: TableProps<Action>['onChange'] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const s = sorter as SorterResult<Action>;
    const field = columnKeyToSortBy[s.columnKey as string] ?? 'updatedAt';
    const order: SortOrder = s.order === 'ascend' ? 'asc' : 'desc';
    onSortChange(field, order);
  };

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
        onChange={handleTableChange}
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
