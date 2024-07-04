import React, { useEffect, useState } from 'react';
import { Icon } from 'UI';
import { Tooltip, Modal, Input, Button, Dropdown, Menu, Tag } from 'antd';
import { UserOutlined, UserAddOutlined, TeamOutlined, LockOutlined, EditOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { withSiteId } from 'App/routes';
import { TYPES } from 'App/constants/card';
import cn from 'classnames';
import { useStore } from 'App/mstore';
import { observer } from 'mobx-react-lite';
import { toast } from 'react-toastify';

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
      <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
      {card.icon && <Icon name={card.icon} size="16" color="tealx" />}
      </div>
    </Tooltip>
  );
}

const MetricListItem: React.FC<Props> = ({
  metric,
  siteId,
  history,
  selected,
  toggleSelection = () => {},
  disableSelection = false,
  renderColumn
}) => {
  const { metricStore } = useStore();
  const [isEdit, setIsEdit] = useState(false);
  const [newName, setNewName] = useState(metric.name);

  const onItemClick = (e: React.MouseEvent) => {
    if (!disableSelection) {
      return toggleSelection(e);
    }
    const path = withSiteId(`/metrics/${metric.metricId}`, siteId);
    history.push(path);
  };

  const onMenuClick = async ({ key }: { key: string }) => {
    if (key === 'delete') {
      Modal.confirm({
        title: 'Confirm',
        content: 'Are you sure you want to permanently delete this card?',
        okText: 'Yes, delete',
        cancelText: 'No',
        onOk: async () => {
          await metricStore.delete(metric);
        },
      });
    }
    if (key === 'rename') {
      setIsEdit(true);
    }
  };

  const onRename = async () => {
    try {
      metric.updateKey('name', newName);
      await metricStore.save(metric);
      metricStore.fetchList();
      setIsEdit(false);
    } catch (e) {
      console.log(e);
      toast.error('Failed to rename card');
    }
  };

  const renderModal = () => (
    <Modal
      title="Rename Card"
      visible={isEdit}
      onCancel={() => setIsEdit(false)}
      footer={[
        <Button key="back" onClick={() => setIsEdit(false)}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={onRename}>
          Save
        </Button>,
      ]}
    >
      <Input
        placeholder="Enter new card title"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
      />
    </Modal>
  );

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
          <Tag className='rounded-lg' bordered={false}>
            {metric.isPublic ? <TeamOutlined className="mr-2" /> : <LockOutlined className="mr-2" />}
            {metric.isPublic ? 'Team' : 'Private'}
          </Tag>
        </div>
      );
    case 'lastModified':
      return new Date(metric.lastModified).toLocaleString();
    case 'options':
      return (
        <>
          <Dropdown
            overlay={
              <Menu onClick={onMenuClick}>
                <Menu.Item key="rename" icon={<EditOutlined />}>
                  Rename
                </Menu.Item>
                <Menu.Item key="delete" icon={<DeleteOutlined />}>
                  Delete
                </Menu.Item>
              </Menu>
            }
            trigger={['click']}
          >
            <Button type="default" icon={<MoreOutlined />} />
          </Dropdown>
          {renderModal()}
        </>
      );
    default:
      return null;
  }
};

export default withRouter(observer(MetricListItem));
