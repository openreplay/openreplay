import { LinkOutlined } from '@ant-design/icons';
import { Segmented } from 'antd';
import React from 'react';

import ByComponent from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/Component';
import { Icon } from 'UI';
import { Circle } from '../Count';
import ExCard from '../ExCard';

function ByUrl(props: any) {
  const [mode, setMode] = React.useState(0);
  const rows = [
    {
      label: '/category/womens/dresses',
      ptitle: 'Dresses',
      value: '500',
      progress: 75,
      icon: <Icon name="icn_url" size={24} />,
    },
    {
      label: '/search?q=summer+dresses',
      ptitle: 'Search: summer dresses',
      value: '306',
      progress: 60,
      icon: <Icon name="icn_url" size={24} />,
    },
    {
      label: '/account/orders',
      ptitle: 'Account: Orders',
      value: '198',
      progress: 30,
      icon: <Icon name="icn_url" size={24} />,
    },
    {
      label: '/checkout/confirmation',
      ptitle: 'Checkout: Confirmation',
      value: '47',
      progress: 15,
      icon: <Icon name="icn_url" size={24} />,
    },
    {
      label: '/checkout/payment',
      ptitle: 'Checkout: Payment',
      value: '5',
      progress: 5,
      icon: <Icon name="icn_url" size={24} />,
    },
  ];

  const lineWidth = 240;
  return <ByComponent {...props} rows={rows} lineWidth={lineWidth} />;
}

export default ByUrl;
