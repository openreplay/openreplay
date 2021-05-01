import React from 'react';
import { Icon } from 'UI';
import stl from './filterItem.css';
import cn from 'classnames';

const FilterItem = ({ className = '', icon, label, onClick }) => {
  return (
    <div className={ cn(stl.filterItem, className) } onClick={ onClick }>
      <Icon name={ icon } size="16" marginRight="8" />
      <span className={ stl.label }>{ label }</span>
    </div>
  );
};

export default FilterItem;
