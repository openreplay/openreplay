import React from 'react';
import cn from 'classnames';
import { Dropdown, Icon } from 'UI';
import stl from './FilterOperator.css';

interface Props {
  filter: any; // event/filter
  // options: any[];
  // value: string;
  onChange: (e, { name, value }) => void;
  className?: string;
}
function FilterOperator(props: Props) {
  const { filter, onChange, className = '' } = props;
  const options = []

  return (
    <Dropdown
      className={ cn(stl.operatorDropdown, className) }      
      options={ filter.operatorOptions }
      name="operator"
      value={ filter.operator }
      onChange={ onChange }
      icon={ <Icon className="ml-5" name="chevron-down" size="12" /> }
    />
  );
}

export default FilterOperator;