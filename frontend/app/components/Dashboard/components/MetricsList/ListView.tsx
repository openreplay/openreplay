import React from 'react';
import { Checkbox, Table } from 'antd';
import MetricListItem from '../MetricListItem';

interface Props {
  list: any;
  siteId: any;
  selectedList: any;
  toggleSelection?: (metricId: any) => void;
  toggleAll?: (e: any) => void;
  disableSelection?: boolean;
  allSelected?: boolean;
  existingCardIds?: number[];
}

const ListView: React.FC<Props> = (props: Props) => {
  const { siteId, list, selectedList, toggleSelection, disableSelection = false, allSelected = false, toggleAll } = props;

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
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      render: (text: any, metric: any) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          disableSelection={disableSelection}
          selected={selectedList.includes(parseInt(metric.metricId))}
          toggleSelection={(e: any) => {
            e.stopPropagation();
            toggleSelection && toggleSelection(parseInt(metric.metricId));
          }}
          renderColumn="title"
        />
      ),
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      sorter: (a: any, b: any) => a.owner.localeCompare(b.owner),
      render: (text: any, metric: any) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          renderColumn="owner"
        />
      ),
    },
    {
      title: 'Visibility',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (text: any, metric: any) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          renderColumn="visibility"
        />
      ),
    },
    {
      title: 'Last Modified',
      dataIndex: 'lastModified',
      key: 'lastModified',
      sorter: (a: any, b: any) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
      render: (text: any, metric: any) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          renderColumn="lastModified"
        />
      ),
    },
    {
      title: 'Options',
      key: 'options',
      render: (text: any, metric: any) => (
        <MetricListItem
          key={metric.metricId}
          metric={metric}
          siteId={siteId}
          renderColumn="options"
        />
      ),
    },
  ];

  const data = list.map((metric: any) => ({
    ...metric,
    key: metric.metricId,
  }));

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="metricId"
      rowSelection={
        !disableSelection
          ? {
              selectedRowKeys: selectedList.map((id: any) => id.toString()),
              onChange: (selectedRowKeys) => {
                selectedRowKeys.forEach((key) => {
                  toggleSelection && toggleSelection(parseInt(key));
                });
              },
            }
          : undefined
      }
      pagination={false}
    />
  );
};

export default ListView;
