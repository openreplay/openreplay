import React from 'react';
import ByComponent from './Component';
import { LinkOutlined } from '@ant-design/icons';

function SlowestDomains(props: any) {
  const rows = [
    {
      label: 'res.cloudinary.com',
      value: '500',
      progress: 75,
      icon: <LinkOutlined size={12} />
    },
    {
      label: 'mintbase.vercel.app',
      value: '306',
      progress: 60,
      icon: <LinkOutlined size={12} />
    },
    {
      label: 'downloads.intercomcdn.com',
      value: '198',
      progress: 30,
      icon: <LinkOutlined size={12} />
    },
    {
      label: 'static.intercomassets.com',
      value: '47',
      progress: 15,
      icon: <LinkOutlined size={12} />
    },
    {
      label: 'mozbar.moz.com',
      value: '5',
      progress: 5,
      icon: <LinkOutlined size={12} />
    }
  ];

  const lineWidth = 200;
  return (
    <ByComponent
      {...props}
      rows={rows}
      lineWidth={lineWidth}
    />
  );
}

export default SlowestDomains;
