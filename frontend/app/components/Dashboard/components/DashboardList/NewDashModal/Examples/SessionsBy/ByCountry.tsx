import React from 'react';

import { Icon } from 'UI';

import ByComponent from './Component';

function ByCountry(props: any) {
  const rows = [
    {
      label: 'United States',
      progress: 70,
      value: '165K',
      icon: <Icon name="color/us" size={26} />,
    },
    {
      label: 'India',
      progress: 25,
      value: '100K',
      icon: <Icon name="color/in" size={26} />,
    },
    {
      label: 'United Kingdom',
      progress: 10,
      value: '50K',
      icon: <Icon name="color/gb" size={26} />,
    },
    {
      label: 'France',
      progress: 7,
      value: '30K',
      icon: <Icon name="color/fr" size={26} />,
    },
    {
      label: 'Germany',
      progress: 4,
      value: '20K',
      icon: <Icon name="color/de" size={26} />,
    },
  ];

  return <ByComponent rows={rows} lineWidth={180} {...props} />;
}

export default ByCountry;
