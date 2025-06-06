import React, { useState } from 'react';
import {
  Table,
  Typography,
  Tooltip,
  Input,
  Button,
  Dropdown,
  Modal as AntdModal,
  Avatar, TableColumnType, Spin
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
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
import { useTranslation } from 'react-i18next';
import ORLoader from 'Shared/ORLoader';

const { Text } = Typography;

interface Props {
  list: Widget[];
  siteId: string;
  selectedList: number[];
  toggleSelection?: (metricId: number | number[]) => void;
  disableSelection?: boolean;
  inLibrary?: boolean;
  loading?: boolean;
}

const ListView: React.FC<Props> = ({
  list,
  siteId,
  selectedList,
  toggleSelection,
  disableSelection = false,
  inLibrary = false,
  loading = false
}) => {
  const { t } = useTranslation();
  const [editingMetricId, setEditingMetricId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const { metricStore } = useStore();
  const history = useHistory();

  const totalMessage = (
    <>
      {t('Showing')}{' '}
      <Text strong>
        {(metricStore.pageSize || 10) * ((metricStore.page || 1) - 1) + 1}
      </Text>{' '}
      {t('to')}{' '}
      <Text strong>
        {Math.min(
          (metricStore.pageSize || 10) * (metricStore.page || 1),
          list.length
        )}
      </Text>{' '}
      {t('of')}&nbsp;<Text strong>{list.length}</Text>&nbsp;{t('cards')}
    </>
  );

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
    if (diffDays <= 1) return `${t('Today at')} ${formatTime(date)}`;
    if (diffDays === 2) return `${t('Yesterday at')} ${formatTime(date)}`;
    if (diffDays <= 3)
      return `${diffDays} ${t('days ago at')} ${formatTime(date)}`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${t('at')} ${formatTime(date)}`;
  };

  const MetricTypeIcon: React.FC<{ type: string }> = ({ type }) => (
    <Tooltip title={<div className="capitalize">{TYPE_NAMES(t)[type]}</div>}>
      <Avatar
        src={
          <Icon
            name={TYPE_ICONS[type]}
            size="16"
            color="tealx"
            strokeColor="tealx"
          />
        }
        size="default"
        className="bg-tealx-lightest text-tealx mr-2 cursor-default avatar-card-list-item"
      />
    </Tooltip>
  );

  const onItemClick = (metric: Widget) => {
    if (disableSelection) {
      const path = withSiteId(`/metrics/${metric.metricId}`, siteId);
      history.push(path);
    }
  };

  const onMenuClick = async (metric: Widget, { key }: { key: string }) => {
    if (key === 'delete') {
      AntdModal.confirm({
        title: t('Confirm'),
        content: t('Are you sure you want to permanently delete this card?'),
        okText: t('Yes, delete'),
        cancelText: t('No'),
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
      toast.error(t('Failed to rename card'));
    }
  };

  const menuItems = [
    { key: 'rename', icon: <EditOutlined />, label: t('Rename') },
    { key: 'delete', icon: <DeleteOutlined />, label: t('Delete') }
  ];

  const renderTitle = (_text: string, metric: Widget) => (
    <div
      className="flex items-center cursor-pointer"
      onClick={() => onItemClick(metric)}
    >
      <MetricTypeIcon type={metric.metricType} />
      <div className={cn('capitalize-first block', !inLibrary ? 'link' : '')}>
        {metric.name}
      </div>
    </div>
  );

  const renderOwner = (_text: string, metric: Widget) => (
    <div>{metric.owner}</div>
  );

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

  const columns: TableColumnType<any>[] = [
    {
      title: t('Title'),
      dataIndex: 'name',
      key: 'title',
      className: 'cap-first pl-4',
      sorter: true,
      sortOrder: metricStore.sort.field === 'name' ? metricStore.sort.order : undefined,
      width: inLibrary ? '31%' : '25%',
      render: renderTitle
    },
    {
      title: t('Owner'),
      dataIndex: 'owner_email',
      key: 'owner',
      className: 'capitalize',
      sorter: true,
      sortOrder: metricStore.sort.field === 'owner_email' ? metricStore.sort.order : undefined,
      width: inLibrary ? '31%' : '25%',
      render: renderOwner
    },
    {
      title: t('Last Modified'),
      dataIndex: 'edited_at',
      key: 'lastModified',
      sorter: true,
      sortOrder: metricStore.sort.field === 'edited_at' ? metricStore.sort.order : undefined,
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

  const handleTableChange = (
    pag: TablePaginationConfig,
    _filters: Record<string, (string | number | boolean)[] | null>,
    sorterParam: SorterResult<Widget> | SorterResult<Widget>[]
  ) => {
    const sorter = Array.isArray(sorterParam) ? sorterParam[0] : sorterParam;
    let order = sorter.order;
    if (metricStore.sort.field === sorter.field) {
      order = metricStore.sort.order === 'ascend' ? 'descend' : 'ascend';
    }
    console.log('sorter', { field: sorter.field, order });
    metricStore.updateKey('sort', { field: sorter.field, order });
    metricStore.updateKey('page', pag.current || 1);
  };

  return (
    <>
      <Table
        columns={columns}
        dataSource={list}
        rowKey="metricId"
        showSorterTooltip={false}
        onChange={handleTableChange}
        sortDirections={['ascend', 'descend']}
        loading={{
          spinning: loading,
          delay: 0,
          indicator: <Spin indicator={<ORLoader />} />,
        }}
        onRow={
          inLibrary
            ? (record) => ({
              onClick: () => {
                if (!disableSelection) toggleSelection?.(record?.metricId);
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
          current: metricStore.page,
          pageSize: metricStore.pageSize,
          total: metricStore.total,
          showSizeChanger: false,
          className: 'px-4',
          showLessItems: true,
          showTotal: () => totalMessage,
          size: 'small',
          simple: true
        }}
      />
      <AntdModal
        title={t('Rename Card')}
        open={editingMetricId !== null}
        okText={t('Save')}
        cancelText={t('Cancel')}
        onOk={onRename}
        onCancel={() => setEditingMetricId(null)}
      >
        <Input
          placeholder={t('Enter new card title')}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </AntdModal>
    </>
  );
};

export default ListView;
