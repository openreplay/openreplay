import React from 'react';

import { Icon } from 'UI';

import ExCard from '../ExCard';
import ByComponent from './Component';

function ByBrowser(props: any) {
  const rows = [
    {
      label: 'Chrome',
      progress: 85,
      value: '2.5K',
      icon: <Icon name="color/chrome" size={26} />,
    },
    {
      label: 'Edge',
      progress: 25,
      value: '405',
      icon: <Icon name="color/edge" size={26} />,
    },
    {
      label: 'Safari',
      progress: 5,
      value: '302',
      icon: <Icon name="color/safari" size={26} />,
    },
    {
      label: 'Firefox',
      progress: 3,
      value: '194',
      icon: <Icon name="color/firefox" size={26} />,
    },
    {
      label: 'Opera',
      progress: 1,
      value: '57',
      icon: <Icon name="color/opera" size={26} />,
    },
  ];

  const lineWidth = 200;
  return <ByComponent {...props} rows={rows} lineWidth={lineWidth} />;
}

export default ByBrowser;
