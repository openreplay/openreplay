import React, { useEffect, useState } from 'react';
import { Icon, Modal } from 'UI';
import { Tooltip, Input, Button, Dropdown, Menu, Tag, Modal as AntdModal, Form, Avatar } from 'antd';
import { TeamOutlined, LockOutlined, EditOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { RouteComponentProps } from 'react-router-dom';
import { withSiteId } from 'App/routes';
import { TYPES } from 'App/constants/card';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';
import { useHistory } from 'react-router';

interface Props extends RouteComponentProps {
  metric: any;
  siteId: string;
  selected?: boolean;
  toggleSelection?: any;
  disableSelection?: boolean;
  renderColumn: string;
}

function MetricTypeIcon({ type }: any) {
  const [card, setCard] = useState<any>('');
  useEffect(() => {
    const t = TYPES.find((i) => i.slug === type);
    setCard(t);
  }, [type]);

  return (
    <Tooltip title={<div className="capitalize">{card.title}</div>}>
      <Avatar src={card.icon && <Icon name={card.icon} size="16" color="tealx" />} className="bg-tealx-lightest mr-2" />
    </Tooltip>
  );
}

const MetricListItem: React.FC<Props> = ({
                                           metric,
                                           siteId,
                                           toggleSelection = () => {
                                           },
                                           disableSelection = false,
                                           renderColumn
                                         }) => {
  const history = useHistory();
  const { metricStore } = useStore();
  const [isEdit, setIsEdit] = useState(false);
  const [newName, setNewName] = useState(metric.name);

  useEffect(() => {
    setNewName(metric.name);
  }, [metric]);

  const onItemClick = (e: React.MouseEvent) => {
    if (!disableSelection) {
      return toggleSelection(e);
    }
    const path = withSiteId(`/metrics/${metric.metricId}`, siteId);
    history.push(path);
  };

  const onMenuClick = async ({ key }: { key: string }) => {
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
      setIsEdit(true);
    }
  };

  const onRename = async () => {
    try {
      metric.update({ name: newName });
      await metricStore.save(metric);
      metricStore.fetchList();
      setIsEdit(false);
    } catch (e) {
      toast.error('Failed to rename card');
    }
  };

  const renderModal = () => (
    <AntdModal
      title="Rename Card"
      open={isEdit}
      okText="Save"
      cancelText="Cancel"
      onOk={onRename}
      onCancel={() => setIsEdit(false)}
    >
      <Input
        placeholder="Enter new card title"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      />
    </AntdModal>
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

    const formatTime = (date: Date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      return `${hours}:${minutes} ${ampm}`;
    };

    if (diffDays <= 1) {
      return `Today at ${formatTime(date)}`;
    } else if (diffDays <= 2) {
      return `Yesterday at ${formatTime(date)}`;
    } else if (diffDays <= 3) {
      return `${diffDays} days ago at ${formatTime(date)}`;
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} at ${formatTime(date)}`;
    }
  };

  const menuItems = [
    {
      key: "rename",
      icon: <EditOutlined />,
      label: "Rename"
    },
    {
      key: "delete",
      icon: <DeleteOutlined />,
      label: "Delete"
    }
  ]
  switch (renderColumn) {
    case 'title':
      return (
        <>
          <div className="flex items-center cursor-pointer" onClick={onItemClick}>
            <MetricTypeIcon type={metric.metricType} />
            <div className="capitalize-first link block">{metric.name}</div>
          </div>
          {renderModal()}
        </>
      );
    case 'owner':
      return <div>{metric.owner}</div>;
    case 'visibility':
      return (
        <div className="flex items-center">
          <Tag className="rounded-lg" bordered={false}>
            {metric.isPublic ? <TeamOutlined className="mr-2" /> : <LockOutlined className="mr-2" />}
            {metric.isPublic ? 'Team' : 'Private'}
          </Tag>
        </div>
      );
    case 'lastModified':
      const date = parseDate(metric.lastModified);
      return formatDate(date);
    case 'options':
      return (
        <>
        <div className='flex justify-end'>
          <Dropdown
            menu={{ items: menuItems, onClick: onMenuClick }}
            trigger={['click']}
          >
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
          </div>
          {renderModal()}
        </>
      );
    default:
      return null;
  }
};

export default observer(MetricListItem);
