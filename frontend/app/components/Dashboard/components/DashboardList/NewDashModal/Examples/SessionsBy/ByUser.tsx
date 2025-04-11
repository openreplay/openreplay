import React from 'react';

import { Avatar, Icon } from 'UI';

import { hashString } from 'Types/session/session';
import ExCard from '../ExCard';
import ByComponent from './Component';

function ByUser(props: any) {
  const rows = [
    {
      label: 'Demo User',
      progress: 85,
      value: '2.5K',
      icon: <Avatar seed={hashString('a')} />,
    },
    {
      label: 'Admin User',
      progress: 25,
      value: '405',
      icon: <Avatar seed={hashString('b')} />,
    },
    {
      label: 'Management User',
      progress: 5,
      value: '302',
      icon: <Avatar seed={hashString('c')} />,
    },
    {
      label: 'Sales User',
      progress: 3,
      value: '194',
      icon: <Avatar seed={hashString('d')} />,
    },
    {
      label: 'Marketing User',
      progress: 1,
      value: '57',
      icon: <Avatar seed={hashString('e')} />,
    },
  ];

  const lineWidth = 200;
  return <ByComponent {...props} rows={rows} lineWidth={lineWidth} />;
}

export default ByUser;
