import React from 'react';
import cn from 'classnames';
import { Dropdown, Icon } from 'UI';
import stl from './FilterValueDropdown.css';

interface Props {
  filter: any; // event/filter
  // options: any[];
  value: string;
  onChange: (e, { name, value }) => void;
  className?: string;
  options: any[];
  search?: boolean;
}
function FilterValueDropdown(props: Props) {
  const { search = false, options, onChange, value, className = '' } = props;
  // const options = []

  return (
    <Dropdown
      search={search}
      className={ cn(stl.operatorDropdown, className) }      
      options={ options }
      name="issue_type"
      value={ value }
      onChange={ onChange }
      placeholder="Select"
      icon={ <Icon className="ml-5" name="chevron-down" size="12" /> }
    />
  );
}

export default FilterValueDropdown;