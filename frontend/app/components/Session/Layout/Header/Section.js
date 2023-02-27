import React from 'react';
import { Icon } from 'UI';

export default function Section({ icon, label }) {
  return (
    <div className="flex items-center mx-4">
      <Icon name={ icon } size="18" color="color-dark" />
      <div className="ml-2 mt-1 font-sm font-normal color-gray-darkest text-sm">{ label }</div>
    </div>
  );
};
