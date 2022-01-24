import React from 'react';
import cn from 'classnames';
import { Dropdown, Icon } from 'UI';
import stl from './FilterOperator.css';

interface Props {
  filter: any; // event/filter
  onChange: (e, { name, value }) => void;
  className?: string;
}
function FilterOperator(props: Props) {
  const { filter, onChange, className = '' } = props;

  console.log('FilterOperator', filter.operator);

  return (
    <Dropdown
      className={ cn(stl.operatorDropdown, className) }      
      options={ filter.operatorOptions }
      name="operator"
      value={ filter.operator }
      onChange={ onChange }
      placeholder="Select operator"
      icon={ <Icon className="ml-5" name="chevron-down" size="12" /> }
    />
  );
}

export default FilterOperator;