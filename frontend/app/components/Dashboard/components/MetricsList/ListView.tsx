import React, { useState, useMemo } from 'react';
import { Checkbox, Table, Typography, Switch, Tag, Tooltip } from 'antd';
import MetricListItem from '../MetricListItem';
import { TablePaginationConfig, SorterResult } from 'antd/lib/table/interface';
import Widget from 'App/mstore/types/widget';
import { LockOutlined, TeamOutlined } from "@ant-design/icons";
import classNames from 'classnames';

const { Text } = Typography;

interface Metric {
  metricId: number;
  name: string;
  owner: string;
  lastModified: string;
  visibility: string;
}

interface Props {
  list: Widget[];
  siteId: string;
  selectedList: number[];
  toggleSelection?: (metricId: number | Array<number>) => void;
  toggleAll?: (e: any) => void;
  disableSelection?: boolean;
  allSelected?: boolean;
  existingCardIds?: number[];
  showOwn?: boolean;
  toggleOwn: () => void;
  inLibrary?: boolean;
}

const ListView: React.FC<Props> = (props: Props) => {
  const {
    siteId,
    list,
    selectedList,
    toggleSelection,
    disableSelection = false,
    inLibrary = false
  } = props;
  const [sorter, setSorter] = useState<{ field: string; order: 'ascend' | 'descend' }>({
    field: 'lastModified',
    order: 'descend'
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10 });
  const totalMessage = (
    <>
      Showing <Text strong>{pagination.pageSize * (pagination.current - 1) + 1}</Text> to <Text
      strong>{Math.min(pagination.pageSize * pagination.current, list.length)}</Text> of <Text
      strong>{list.length}</Text> cards
    </>
  );

  const sortedData = useMemo(() => {
    return [...list].sort((a, b) => {
      if (sorter.field === 'lastModified') {
        return sorter.order === 'ascend'
          ? new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
          : new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      } else if (sorter.field === 'name') {
        return sorter.order === 'ascend' ? a.name?.localeCompare(b.name) : b.name?.localeCompare(a.name);
      } else if (sorter.field === 'owner') {
        return sorter.order === 'ascend' ? a.owner?.localeCompare(b.owner) : b.owner?.localeCompare(a.owner);
      }
      return 0;
    });
  }, [list, sorter]);

  const paginatedData = useMemo(() => {
    const start = (pagination.current! - 1) * pagination.pageSize!;
    const end = start + pagination.pageSize!;
    return sortedData.slice(start, end).map(metric => ({ ...metric, key: metric.metricId}));
  }, [sortedData, pagination]);

  const handleTableChange = (
    pagination: TablePaginationConfig,
    filters: Record<string, (string | number | boolean)[] | null>,
    sorter: SorterResult<Metric> | SorterResult<Metric>[]
  ) => {
    const sortResult = sorter as SorterResult<Metric>;
    setSorter({
      field: sortResult.field as string,
      order: sortResult.order as 'ascend' | 'descend'
    });
    setPagination(pagination);
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'name',
      key: 'title',
      className: 'cap-first pl-4',
      sorter: true,
      width: '25%',
      render: (text: string, metric: Metric) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          inLibrary={inLibrary}
          disableSelection={!inLibrary}
          renderColumn="title"
        />
      )
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      className: 'capitalize',
      width: '25%',
      sorter: true,
      render: (text: string, metric: Metric) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          renderColumn="owner"
        />
      )
    },
    {
      title: 'Last Modified',
      dataIndex: 'lastModified',
      key: 'lastModified',
      sorter: true,
      width: '25%',
      render: (text: string, metric: Metric) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          renderColumn="lastModified"
        />
      )
    },
  ];
  if (!inLibrary) {
    columns.push({
        title: '',
        key: 'options',
        className: 'text-right',
        width: '5%',
        render: (text: string, metric: Metric) => (
          <MetricListItem
            key={metric.metricId}
            metric={metric}
            siteId={siteId}
            renderColumn="options"
          />
        )
    })
  } else {
    columns.forEach(col => {
      col.width = '31%';
    })
  }

  return (
    <Table
      columns={columns}
      dataSource={paginatedData}
      rowKey="metricId"
      onChange={handleTableChange}
      onRow={inLibrary ? (record) => ({
        onClick: () => disableSelection ? null : toggleSelection?.(record.metricId)
      }) : undefined}
      rowSelection={
        !disableSelection
          ? {
            selectedRowKeys: selectedList,
            onChange: (selectedRowKeys) => {
              toggleSelection(selectedRowKeys);
            },
            columnWidth: 16,
          }
          : undefined
      }
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: sortedData.length,
        showSizeChanger: false,
        className: 'px-4',
        showLessItems: true,
        showTotal: () => totalMessage,
        size: 'small',
        simple: 'true',
      }}
    />
  );
};

export default ListView;
