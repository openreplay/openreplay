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
  multiple?: boolean;
  showCloseButton?: boolean;
  showOrButton?: boolean;
  onRemoveValue?: () => void;
  onAddValue?: () => void;
}
function FilterValueDropdown(props: Props) {
  const { filter, multiple = false, search = false, options, onChange, value, className = '', showCloseButton = true, showOrButton = true } = props;
  // const options = []

  return (
    <div className={stl.wrapper}>      
      <Dropdown
        search={search}
        className={ cn(stl.operatorDropdown, className, "filterDropdown") }
        options={ options }
        name="issue_type"
        value={ value }
        onChange={ onChange }
        placeholder="Select"
        fluid
        icon={ <Icon className="absolute right-0 mr-2" name="chevron-down" size="12" /> }
      />
      <div
        className={stl.right}
        // onClick={showOrButton ? onRemoveValue : onAddValue}
      >
        { showCloseButton && <div onClick={props.onRemoveValue}><Icon name="close" size="12" /></div> }
        { showOrButton && <div onClick={props.onAddValue} className="color-teal"><span className="px-1">or</span></div> }
      </div>
    </div>
  );
}

export default FilterValueDropdown;