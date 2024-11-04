import React, { useState, useMemo } from 'react';
import { Checkbox, Table, Typography } from 'antd';
import MetricListItem from '../MetricListItem';
import { TablePaginationConfig, SorterResult } from 'antd/lib/table/interface';
import Widget from 'App/mstore/types/widget';

const { Text } = Typography;

// interface Metric {
//   metricId: number;
//   name: string;
//   owner: string;
//   lastModified: string;
//   visibility: string;
// }

interface Props {
  list: Widget[];
  siteId: string;
  selectedList: number[];
  toggleSelection?: (metricId: number) => void;
  toggleAll?: (e: any) => void;
  disableSelection?: boolean;
  allSelected?: boolean;
  existingCardIds?: number[];
}

const ListView: React.FC<Props> = (props: Props) => {
  const {
    siteId,
    list,
    selectedList,
    toggleSelection,
    disableSelection = false,
    allSelected = false,
    toggleAll
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
    return sortedData.slice(start, end);
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
      title: (
        <div className="flex items-center">
          {!disableSelection && (
            <Checkbox
              name="slack"
              className="mr-4"
              checked={allSelected}
              onClick={toggleAll}
            />
          )}
          <span>Title</span>
        </div>
      ),
      dataIndex: 'name',
      key: 'title',
      className: 'cap-first',
      sorter: true,
      render: (text: string, metric: Metric) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          disableSelection={disableSelection}
          selected={selectedList.includes(metric.metricId)}
          toggleSelection={(e: any) => {
            e.stopPropagation();
            toggleSelection && toggleSelection(metric.metricId);
          }}
          renderColumn="title"
        />
      )
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      className: 'capitalize',
      width: '30%',
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
      width: '16.67%',
      render: (text: string, metric: Metric) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          renderColumn="lastModified"
        />
      )
    },
    // {
    //   title: 'Visibility',
    //   dataIndex: 'visibility',
    //   key: 'visibility',
    //   width: '10%',
    //   render: (text: string, metric: Metric) => (
    //     <MetricListItem
    //       key={metric.metricId}
    //       metric={metric}
    //       siteId={siteId}
    //       renderColumn="visibility"
    //     />
    //   )
    // },
    {
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
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={paginatedData}
      rowKey="metricId"
      onChange={handleTableChange}
      size='middle'
      rowSelection={
        !disableSelection
          ? {
            selectedRowKeys: selectedList.map((id: number) => id.toString()),
            onChange: (selectedRowKeys) => {
              selectedRowKeys.forEach((key: any) => {
                toggleSelection && toggleSelection(parseInt(key));
              });
            }
          }
          : undefined
      }
      // footer={() => (
      //   <div className="flex justify-end">
      //     <Checkbox name="slack" checked={allSelected} onClick={toggleAll}>
      //       Select All
      //     </Checkbox>
      //   </div>
      // )}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: sortedData.length,
        showSizeChanger: false,
        className: 'px-4',
        showLessItems: true,
        showTotal: () => totalMessage,
        showQuickJumper: true
      }}
    />
  );
};

export default ListView;
