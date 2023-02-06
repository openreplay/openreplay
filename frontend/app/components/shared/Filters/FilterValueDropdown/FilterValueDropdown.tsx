import React from 'react';
import { Icon } from 'UI';
import stl from './FilterValueDropdown.module.css';
import Select from 'Shared/Select';


const dropdownStyles = {
  control: (provided: any) => {
    const obj = {
      ...provided,
      border: 'solid thin transparent !important',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      height: '26px',
      minHeight: '26px',
      borderRadius: '3px',
      boxShadow: 'none !important',
    }
    return obj;
  },
  valueContainer: (provided: any) => ({
    ...provided,
    // paddingRight: '0px',
    width: 'fit-content',
    alignItems: 'center',
    height: '26px',
    padding: '0 3px'
  }),
  // placeholder: (provided: any) => ({
  //   ...provided,
  // }),
  indicatorsContainer: (provided: any) => ({
    ...provided,
    padding: '0px',
    height: '26px',
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    whiteSpace: 'nowrap',
  }),
  menu: (provided: any, state: any) => ({
      ...provided,
      top: 20,
      left: 0,
      minWidth: 'fit-content',
      overflow: 'hidden',
  }),
  container: (provided: any) => ({
      ...provided,
    width: '100%',
  }),
  input: (provided: any) => ({
    ...provided,
    height: '22px',
    '& input:focus': {
      border: 'none !important',
    }
  }),
  singleValue: (provided: any, state: { isDisabled: any; }) => {
    const opacity = state.isDisabled ? 0.5 : 1;
    const transition = 'opacity 300ms';

    return {
      ...provided, opacity, transition,
      display: 'flex',
      alignItems: 'center',
      height: '20px',
    };
  }
}
interface Props {
  // filter: any; // event/filter
  // options: any[];
  placeholder?: string
  value: string;
  onChange: (value: any) => void;
  className?: string;
  options: any[];
  search?: boolean;
  // multiple?: boolean;
  showCloseButton?: boolean;
  showOrButton?: boolean;
  onRemoveValue?: () => void;
  onAddValue?: () => void;
  isMultilple?: boolean;
}
function FilterValueDropdown(props: Props) {
  const { placeholder = 'Select', isMultilple = true, search = false, options, onChange, value, className = '', showCloseButton = true, showOrButton = true } = props;
  // const options = []

  return (
    <div className="relative flex items-center w-full">
      <div className={stl.wrapper}>      
        <Select
          isSearchable={search}
          // className={ cn(stl.operatorDropdown, className, "filterDropdown") }
          options={ options }
          name="issue_type"
          defaultValue={ value }
          onChange={ (value: any) => onChange(value.value) }
          placeholder={placeholder}
          styles={dropdownStyles}
        />
        <div
          className={stl.right}
          // onClick={showOrButton ? onRemoveValue : onAddValue}
        >
          { showCloseButton && <div onClick={props.onRemoveValue}><Icon name="close" size="12" /></div> }
          { showOrButton && <div onClick={props.onAddValue} className="color-teal"><span className="px-1">or</span></div> }
        </div>
      </div>

      { !showOrButton && isMultilple && <div className="ml-3">or</div> }
    </div>
  );
}

export default FilterValueDropdown;