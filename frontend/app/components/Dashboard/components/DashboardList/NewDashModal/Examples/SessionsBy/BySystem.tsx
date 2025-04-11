import React from 'react';

import { Icon } from 'UI';

import ByComponent from './Component';

function BySystem(props: any) {
  const rows = [
    {
      label: 'Windows',
      progress: 75,
      value: '2.5K',
      icon: <Icon name="color/microsoft" size={26} />,
    },
    {
      label: 'MacOS',
      progress: 25,
      value: '405',
      icon: <Icon name="color/apple" size={26} />,
    },
    {
      label: 'Ubuntu',
      progress: 10,
      value: '302',
      icon: <Icon name="color/ubuntu" size={26} />,
    },
    {
      label: 'Fedora',
      progress: 7,
      value: '302',
      icon: <Icon name="color/fedora" size={26} />,
    },
    {
      label: 'Unknown',
      progress: 4,
      value: '194',
      icon: <Icon name="question-circle" size={26} />,
    },
  ];

  const lineWidth = 200;
  return <ByComponent {...props} rows={rows} lineWidth={lineWidth} />;
}

export default BySystem;
