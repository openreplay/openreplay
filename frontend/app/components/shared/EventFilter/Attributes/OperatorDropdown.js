import React from 'react';
import cn from 'classnames';
import { Dropdown, Icon } from 'UI';
import stl from './attributeItem.css'

const OperatorDropdown = ({ options, value, onChange }) => {
  return (
    <Dropdown
      className={ cn(stl.operatorDropdown) }      
      options={ options }
      name="operator"
      value={ value }
      onChange={ onChange }
      icon={ <Icon className="ml-5" name="chevron-down" size="12" /> }
    />
  );
};

export default OperatorDropdown;
