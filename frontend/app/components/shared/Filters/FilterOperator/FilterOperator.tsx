import React from 'react';
import cn from 'classnames';
import { Dropdown, Icon } from 'UI';
import stl from './FilterOperator.css';

interface Props {
  // filter: any; // event/filter
  onChange: (e, { name, value }) => void;
  className?: string;
  options?: any;
  value?: string;
}
function FilterOperator(props: Props) {
  const { options, value, onChange, className = '' } = props;

  return (
    <Dropdown
      className={ cn(stl.operatorDropdown, className, 'hover:bg-gray-light-shade') }      
      options={ options }
      name="operator"
      value={ value }
      onChange={ onChange }
      placeholder="Select operator"
      icon={ <Icon className="ml-5" name="chevron-down" size="12" /> }
    />
  );
}

export default FilterOperator;