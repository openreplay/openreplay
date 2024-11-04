import React from 'react';
import { Checkbox } from 'UI';
import cn from 'classnames';
import stl from './featureItem.module.css';

const FeatureItem = ({ label, completed = false, subText, onClick }) => {
  return (
    <div
      className={ cn(stl.wrapper, { [stl.activeLink]: onClick, [stl.completed]: completed }) }
      onClick={onClick && onClick}
    >
      <Checkbox
        label={ label }
        className={ cn(stl.checkbox, completed ? stl.active : '') }
        name="strict"
        checked={ completed }
        readOnly={ true }
      />
      { subText && 
        <div className={ stl.subText }>{ subText }</div>
      }
    </div>
  );
};

export default FeatureItem;
