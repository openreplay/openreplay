import React from 'react';
import { Icon } from 'UI';

const TabItem = ({ active = false, onClick, icon, label }) => {
  return (
    <li>
      <a data-active={ active } onClick={ onClick } className="flex items-center">
        <Icon name={ icon } size="16" marginRight="10" />
        <span>{ label }</span>
      </a>
    </li>
  );
};

export default TabItem;
