import React, { useState, useMemo } from 'react';
import {
  Table,
  Typography,
  Tag,
  Tooltip,
  Input,
  Button,
  Dropdown,
  Modal as AntdModal,
  Avatar
} from 'antd';
import { TeamOutlined, LockOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { EllipsisVertical } from 'lucide-react';
import { TablePaginationConfig, SorterResult } from 'antd/lib/table/interface';
import { useStore } from 'App/mstore';
import { toast } from 'react-toastify';
import { useHistory } from 'react-router';
import { withSiteId } from 'App/routes';
import { Icon } from 'UI';
import cn from 'classnames';
import { TYPE_ICONS, TYPE_NAMES } from 'App/constants/card';
import Widget from 'App/mstore/types/widget';

const { Text } = Typography;

interface Props {
  list: Widget[];
  siteId: string;
  selectedList: number[];
  toggleSelection?: (metricId: number | number[]) => void;
  disableSelection?: boolean;
  inLibrary?: boolean;
}

const ListView: React.FC<Props> = ({
                                     list,
                                     siteId,
                                     selectedList,
                                     toggleSelection,
                                     disableSelection = false,
                                     inLibrary = false
                                   }) => {
  const [sorter, setSorter] = useState<{ field: string; order: 'ascend' | 'descend' }>({
    field: 'lastModified',
    order: 'descend'
  });
  const [pagination, setPagination] = useState<TablePaginationConfig>({ current: 1, pageSize: 10 });
  const [editingMetricId, setEditingMetricId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const { metricStore } = useStore();
  const history = useHistory();

  const sortedData = useMemo(() => {
    return [...list].sort((a, b) => {
      if (sorter.field === 'lastModified') {
        return sorter.order === 'ascend'
          ? new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime()
          : new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      } else if (sorter.field === 'name') {
        return sorter.order === 'ascend'
          ? (a.name?.localeCompare(b.name) || 0)
          : (b.name?.localeCompare(a.name) || 0);
      } else if (sorter.field === 'owner') {
        return sorter.order === 'ascend'
          ? (a.owner?.localeCompare(b.owner) || 0)
          : (b.owner?.localeCompare(a.owner) || 0);
      }
      return 0;
    });
  }, [list, sorter]);

  const paginatedData = useMemo(() => {
    const start = ((pagination.current || 1) - 1) * (pagination.pageSize || 10);
    return sortedData.slice(start, start + (pagination.pageSize || 10));
  }, [sortedData, pagination]);

  const totalMessage = (
    <>
      Showing{' '}
      <Text strong>
        {(pagination.pageSize || 10) * ((pagination.current || 1) - 1) + 1}
      </Text>{' '}
      to{' '}
      <Text strong>
        {Math.min((pagination.pageSize || 10) * (pagination.current || 1), list.length)}
      </Text>{' '}
      of <Text strong>{list.length}</Text> cards
    </>
  );

  const handleTableChange = (
    pag: TablePaginationConfig,
    _filters: Record<string, (string | number | boolean)[] | null>,
    sorterParam: SorterResult<Widget> | SorterResult<Widget>[]
  ) => {
    const sortRes = sorterParam as SorterResult<Widget>;
    setSorter({
      field: sortRes.field as string,
      order: sortRes.order as 'ascend' | 'descend'
    });
    setPagination(pag);
  };

  const parseDate = (dateString: string) => {
    let date = new Date(dateString);
    if (isNaN(date.getTime())) {
      date = new Date(parseInt(dateString, 10));
    }
    return date;
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const formatTime = (d: Date) => {
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    };
    if (diffDays <= 1) return `Today at ${formatTime(date)}`;
    if (diffDays === 2) return `Yesterday at ${formatTime(date)}`;
    if (diffDays <= 3) return `${diffDays} days ago at ${formatTime(date)}`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} at ${formatTime(date)}`;
  };

  const MetricTypeIcon: React.FC<{ type: string }> = ({ type }) => (
    <Tooltip title={<div className="capitalize">{TYPE_NAMES[type]}</div>}>
      <Avatar
        src={
          <Icon name={TYPE_ICONS[type]} size="16" color="tealx" strokeColor="tealx" />
        }
        size="default"
        className="bg-tealx-lightest text-tealx mr-2 cursor-default avatar-card-list-item"
      />
    </Tooltip>
  );

  const onItemClick = (metric: Widget) => {
    if (disableSelection) return;
    if (toggleSelection) {
      toggleSelection(metric.metricId);
    } else {
      const path = withSiteId(`/metrics/${metric.metricId}`, siteId);
      history.push(path);
    }
  };

  const onMenuClick = async (metric: Widget, { key }: { key: string }) => {
    if (key === 'delete') {
      AntdModal.confirm({
        title: 'Confirm',
        content: 'Are you sure you want to permanently delete this card?',
        okText: 'Yes, delete',
        cancelText: 'No',
        onOk: async () => {
          await metricStore.delete(metric);
        }
      });
    }
    if (key === 'rename') {
      setEditingMetricId(metric.metricId);
      setNewName(metric.name);
    }
  };

  const onRename = async () => {
    const metric = list.find((m) => m.metricId === editingMetricId);
    if (!metric) return;
    try {
      metric.update({ name: newName });
      await metricStore.save(metric);
      // await metricStore.fetchList();
      setEditingMetricId(null);
    } catch (e) {
      toast.error('Failed to rename card');
    }
  };

  const menuItems = [
    { key: 'rename', icon: <EditOutlined />, label: 'Rename' },
    { key: 'delete', icon: <DeleteOutlined />, label: 'Delete' }
  ];

  const renderTitle = (_text: string, metric: Widget) => (
    <div className="flex items-center cursor-pointer" onClick={() => onItemClick(metric)}>
      <MetricTypeIcon type={metric.metricType} />
      <div className={cn('capitalize-first block', !inLibrary ? 'link' : '')}>
        {metric.name}
      </div>
    </div>
  );

  const renderOwner = (_text: string, metric: Widget) => <div>{metric.owner}</div>;

  const renderLastModified = (_text: string, metric: Widget) => {
    const date = parseDate(metric.lastModified);
    return formatDate(date);
  };

  const renderOptions = (_text: string, metric: Widget) => (
    <div className="flex justify-end pr-4">
      <Dropdown
        menu={{ items: menuItems, onClick: (e) => onMenuClick(metric, e) }}
        trigger={['click']}
      >
        <Button
          icon={<EllipsisVertical size={16} />}
          className="btn-cards-list-item-more-options"
          type="text"
        />
      </Dropdown>
    </div>
  );

  const columns = [
    {
      title: 'Title',
      dataIndex: 'name',
      key: 'title',
      className: 'cap-first pl-4',
      sorter: true,
      width: inLibrary ? '31%' : '25%',
      render: renderTitle
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      className: 'capitalize',
      sorter: true,
      width: inLibrary ? '31%' : '25%',
      render: renderOwner
    },
    {
      title: 'Last Modified',
      dataIndex: 'lastModified',
      key: 'lastModified',
      sorter: true,
      width: inLibrary ? '31%' : '25%',
      render: renderLastModified
    }
  ];
  if (!inLibrary) {
    columns.push({
      title: '',
      key: 'options',
      className: 'text-right',
      width: '5%',
      render: renderOptions
    });
  }

  return (
    <>
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey="metricId"
        onChange={handleTableChange}
        onRow={
          inLibrary
            ? (record) => ({
              onClick: () => {
                if (!disableSelection) toggleSelection?.(record.metricId);
              }
            })
            : undefined
        }
        rowSelection={
          !disableSelection
            ? {
              selectedRowKeys: selectedList,
              onChange: (keys) => toggleSelection && toggleSelection(keys),
              columnWidth: 16
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
          simple: true
        }}
      />
      <AntdModal
        title="Rename Card"
        open={editingMetricId !== null}
        okText="Save"
        cancelText="Cancel"
        onOk={onRename}
        onCancel={() => setEditingMetricId(null)}
      >
        <Input
          placeholder="Enter new card title"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </AntdModal>
    </>
  );
};

export default ListView;
