import React from 'react';
import { LinkOutlined } from '@ant-design/icons';
import { Icon } from 'UI';
import ByComponent from './Component';

function SlowestDomains(props: any) {
  const rows = [
    {
      label: 'res.cloudinary.com',
      value: '500',
      progress: 75,
      icon: <Icon name="link-45deg" size={24} />,
    },
    {
      label: 'mintbase.vercel.app',
      value: '306',
      progress: 60,
      icon: <Icon name="link-45deg" size={24} />,
    },
    {
      label: 'downloads.intercomcdn.com',
      value: '198',
      progress: 30,
      icon: <Icon name="link-45deg" size={24} />,
    },
    {
      label: 'static.intercomassets.com',
      value: '47',
      progress: 15,
      icon: <Icon name="link-45deg" size={24} />,
    },
    {
      label: 'mozbar.moz.com',
      value: '5',
      progress: 5,
      icon: <Icon name="link-45deg" size={24} />,
    },
  ];

  const lineWidth = 200;
  return <ByComponent {...props} rows={rows} lineWidth={lineWidth} />;
}

export default SlowestDomains;
