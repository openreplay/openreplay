import React, { useEffect, useState } from 'react';
import { Icon, Checkbox, Tooltip, confirm, Modal } from 'UI';
import { Dropdown, Button, Input } from 'antd';
import { checkForRecent } from 'App/date';
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
}

function MetricTypeIcon({ type }: any) {
  const [card, setCard] = useState<any>('');
  useEffect(() => {
    const t = TYPES.find((i) => i.slug === type);
    setCard(t);
  }, [type]);

  return (
    <Tooltip delay={0} title={<div className="capitalize">{card.title}</div>}>
      <div className="w-9 h-9 rounded-full bg-tealx-lightest flex items-center justify-center mr-2">
        {card.icon && <Icon name={card.icon} size="16" color="tealx" />}
      </div>
    </Tooltip>
  );
}

function MetricListItem(props: Props) {
  const {
    metric,
    history,
    siteId,
    selected,
    toggleSelection = () => {},
    disableSelection = false,
  } = props;
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
      if (await confirm({
        header: 'Confirm',
        confirmButton: 'Yes, delete',
        confirmation: `Are you sure you want to permanently delete this card?`
      })) {
        await metricStore.delete(metric)
        toast.success('Card deleted');
      }
    }
    if (key === 'rename') {
      setIsEdit(true);
    }
  }
  const onRename = async () => {
    try {
      metric.updateKey('name', newName);
      await metricStore.save(metric);
      void metricStore.fetchList()
      setIsEdit(false)
    } catch (e) {
      console.log(e)
      toast.error('Failed to rename card');
    }}

  return (
    <>
      <Modal open={isEdit} onClose={() => setIsEdit(false)}>
        <Modal.Header>Rename Card</Modal.Header>
        <Modal.Content>
          <Input
            placeholder="Enter new card title"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </Modal.Content>
        <Modal.Footer>
          <Button
            onClick={onRename}
            type={'primary'}
            className="mr-2"
          >
            Save
          </Button>

          <Button
            onClick={() => setIsEdit(false)}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
      <div
        className="grid grid-cols-12 py-4 border-t select-none items-center hover:bg-active-blue cursor-pointer px-6"
        onClick={onItemClick}
      >
        <div className="col-span-4 flex items-center">
          {!disableSelection && (
            <Checkbox
              name="slack"
              className="mr-4"
              type="checkbox"
              checked={selected}
              onClick={toggleSelection}
            />
          )}

          <div className="flex items-center">
            <MetricTypeIcon type={metric.metricType} />
            <div className={cn('capitalize-first', { link: disableSelection })}>{metric.name}</div>
          </div>
        </div>
        <div className="col-span-2">{metric.owner}</div>
        <div className="col-span-2">
          <div className="flex items-center">
            <Icon name={metric.isPublic ? 'user-friends' : 'person-fill'} className="mr-2" />
            <span>{metric.isPublic ? 'Team' : 'Private'}</span>
          </div>
        </div>
        <div className="col-span-2">
          {metric.lastModified && checkForRecent(metric.lastModified, 'LLL dd, yyyy, hh:mm a')}
        </div>
        <div className={'col-span-2'} onClick={e => e.stopPropagation()}>
          <Dropdown menu={{
            items: [
              {
                label: "Rename",
                key: "rename",
                icon: <Icon name={'pencil'} size="16" />,
              },
              {
                label: "Delete",
                key: "delete",
                icon: <Icon name={'trash'} size="16" />
              }
            ],
            onClick: onMenuClick,
          }}>
          <div className={'ml-auto p-2 rounded border border-transparent w-fit hover:border-gray-light'}>
            <Icon name="ellipsis-v" size="16" />
          </div>
          </Dropdown>
        </div>
      </div>
    </>
  );
}

export default withRouter(observer(MetricListItem));
