import React from 'react';
import { useHistory } from 'react-router';
import { useStore } from 'App/mstore';
import { useObserver } from 'mobx-react-lite';
import { Button, Dropdown, MenuProps, message, Modal } from 'antd';
import {
  BellIcon,
  EllipsisVertical,
  EyeOffIcon,
  PencilIcon,
  TrashIcon,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { dashboardMetricDetails, withSiteId } from 'App/routes';

function CardMenu({ card }: any) {
  const siteId = location.pathname.split('/')[1];
  const history = useHistory();
  const { dashboardStore, metricStore } = useStore();
  const dashboardId = dashboardStore.selectedDashboard?.dashboardId;

  const items: MenuProps['items'] = [
    {
      key: 'edit',
      label: 'Edit',
      icon: <PencilIcon size={16} />,
    },
    {
      key: 'hide',
      label: 'Remove from Dashboard',
      icon: <EyeOffIcon size={16} />,
    },
  ];

  const onClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'edit') {
      history.push(
        withSiteId(dashboardMetricDetails(dashboardId, card.metricId), siteId),
      );
    } else if (key === 'hide') {
      dashboardStore
        .deleteDashboardWidget(dashboardId!, card.widgetId)
        .then((r) => null);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Dropdown menu={{ items, onClick }} overlayStyle={{ minWidth: '120px' }}>
        <Button type="text" icon={<EllipsisVertical size={16} />} />
      </Dropdown>
    </div>
  );
}

export default CardMenu;
