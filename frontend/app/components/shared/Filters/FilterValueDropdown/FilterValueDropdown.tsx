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
      borderRadius: '.5rem',
      boxShadow: 'none !important',
    };
    return obj;
  },
  valueContainer: (provided: any) => ({
    ...provided,
    // paddingRight: '0px',
    width: 'fit-content',
    alignItems: 'center',
    height: '26px',
    padding: '0 3px',
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
    },
  }),
  singleValue: (provided: any, state: { isDisabled: any }) => {
    const opacity = state.isDisabled ? 0.5 : 1;
    const transition = 'opacity 300ms';

    return {
      ...provided,
      opacity,
      transition,
      display: 'flex',
      alignItems: 'center',
      height: '20px',
    };
  },
};
interface Props {
  placeholder?: string;
  value: string;
  onChange: (value: any, ind: number) => void;
  className?: string;
  options: any[];
  search?: boolean;
  showCloseButton?: boolean;
  showOrButton?: boolean;
  onRemoveValue?: (ind: number) => void;
  onAddValue?: (ind: number) => void;
  isMultiple?: boolean;
  index: number;
}
function FilterValueDropdown(props: Props) {
  const {
    placeholder = 'Select',
    isMultiple = true,
    search = false,
    options,
    onChange,
    value,
    showCloseButton = true,
    showOrButton = true,
    index,
  } = props;

  return (
    <div className="relative flex items-center w-full">
      <div className={stl.wrapper}>
        <Select
          isSearchable={search}
          options={options}
          name="issue_type"
          value={value ? options.find((item) => item.value === value) : null}
          onChange={(value: any) => onChange(value.value, index)}
          placeholder={placeholder}
          styles={dropdownStyles}
        />
        <div className={stl.right}>
          {showCloseButton && (
            <div onClick={() => props.onRemoveValue?.(index)}>
              <Icon name="close" size="12" />
            </div>
          )}
          {showOrButton && (
            <div onClick={() => props.onAddValue?.(index)} className="color-teal">
              <span className="px-1">or</span>
            </div>
          )}
        </div>
      </div>

      {!showOrButton && isMultiple && <div className="ml-3">or</div>}
    </div>
  );
}

interface MainProps {
  placeholder?: string;
  value: string[];
  onChange: (value: any, ind: number) => void;
  className?: string;
  options: any[];
  search?: boolean;
  showCloseButton?: boolean;
  showOrButton?: boolean;
  onRemoveValue?: (ind: number) => void;
  onAddValue?: (ind: number) => void;
  isMultiple?: boolean;
}

function FilterDropdownController(props: MainProps) {
  return props.value.map((value, index) => (
    <FilterValueDropdown
      {...props}
      key={index}
      value={value}
      index={index}
      showOrButton={index === props.value.length - 1}
      showCloseButton={props.value.length > 1}
    />
  ))
}

export default FilterDropdownController;
