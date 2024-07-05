import React from 'react';
import { Checkbox, Table } from 'antd';
import MetricListItem from '../MetricListItem';
import classNames from 'classnames';

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
      className: 'cap-first',
      sorter: (a: any, b: any) => a.name.localeCompare(b.name),
      width: '40%',
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
      className: 'capitalize',
      sorter: (a: any, b: any) => a.owner.localeCompare(b.owner),
      width: '25%',
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
      title: 'Last Modified',
      dataIndex: 'lastModified',
      key: 'lastModified',
      sorter: (a: any, b: any) => new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime(),
      width: '20%',
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
      title: 'Visibility',
      dataIndex: 'visibility',
      key: 'visibility',
      width: '10%',
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
      title: '',
      key: 'options',
      className: 'text-right',
      width: '5%',
      align: 'right',
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
