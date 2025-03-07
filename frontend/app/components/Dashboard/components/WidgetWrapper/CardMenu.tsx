import React from 'react';
import { useNavigate } from 'react-router';
import { useStore } from 'App/mstore';
import { Button, Dropdown, MenuProps } from 'antd';
import { EllipsisVertical, EyeOffIcon, PencilIcon } from 'lucide-react';
import { dashboardMetricDetails, withSiteId } from 'App/routes';

function CardMenu({ card }: any) {
  const siteId = location.pathname.split('/')[1];
  const navigate = useNavigate();
  const { dashboardStore } = useStore();
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
      navigate(
        withSiteId(dashboardMetricDetails(dashboardId, card.metricId), siteId)
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
