import React from 'react';
import { Icon } from 'UI';
import cn from 'classnames';
import stl from './featureItem.module.css';

const FeatureItem = ({ label, completed = false, subText, onClick }) => {
  return (
    <div
      className={ cn(stl.wrapper, stl.activeLink, { [stl.completed]: completed }) }
      onClick={onClick && onClick}
    >
      <div className={ cn("h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center", { 'bg-gray-lightest border' : !completed, 'bg-teal' : completed })}>
        { completed && <Icon name="check" size="16" color="white" /> }
      </div>
      <div className="ml-3">{label}</div>     
    </div>
  );
};

export default FeatureItem;
