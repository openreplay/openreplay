import React from 'react';

import ByComponent from 'Components/Dashboard/components/DashboardList/NewDashModal/Examples/SessionsBy/Component';
import { Icon } from 'UI';

function ByReferrer(props: any) {
  const rows = [
    {
      label: 'https://www.google.com',
      ptitle: 'Dresses',
      value: '500',
      progress: 75,
      icon: <Icon name="icn_referrer" size={24} />,
    },
    {
      label: 'https://www.reddit.com',
      ptitle: 'Search: summer dresses',
      value: '306',
      progress: 60,
      icon: <Icon name="icn_referrer" size={24} />,
    },
    {
      label: 'https://www.company.com/account/orders',
      ptitle: 'Account: Orders',
      value: '198',
      progress: 30,
      icon: <Icon name="icn_referrer" size={24} />,
    },
    {
      label: 'android-app://com.slack/',
      ptitle: 'Checkout: Confirmation',
      value: '47',
      progress: 15,
      icon: <Icon name="icn_referrer" size={24} />,
    },
  ];

  const lineWidth = 240;
  return <ByComponent {...props} rows={rows} lineWidth={lineWidth} />;
}

export default ByReferrer;
