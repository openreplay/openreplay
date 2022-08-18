import React from 'react';
import Select from 'Shared/Select';

const dropdownStyles = {
  control: (provided: any) => {
    const obj = {
      ...provided,
      border: 'solid thin #ddd !important',
      boxShadow: 'none !important',
      cursor: 'pointer',
      height: '26px',
      minHeight: '26px',
      backgroundColor: '#f6f6f6',
      '&:hover': {
        backgroundColor: '#EEEEEE',
      },
    }
    return obj;
  },
  valueContainer: (provided: any) => ({
    ...provided,
    paddingRight: '0px',
    width: 'fit-content',
    '& input': {
      marginTop: '-3px',
    },
  }),
  placeholder: (provided: any) => ({
    ...provided,
  }),
  indicatorsContainer: (provided: any) => ({
    ...provided,
    padding: '0px',
    height: '26px',
  }),
  // option: (provided: any, state: any) => ({
  //   ...provided,
  //   whiteSpace: 'nowrap',
  // }),
  menu: (provided: any, state: any) => ({
      ...provided,
      top: 20,
      left: 0,
      minWidth: 'fit-content',
      overflow: 'hidden',
  }),
  container: (provided: any) => ({
      ...provided,
      minWidth: "max-content",
  }),
  singleValue: (provided: any, state: { isDisabled: any; }) => {
    const opacity = state.isDisabled ? 0.5 : 1;
    const transition = 'opacity 300ms';

    return {
      ...provided,
      opacity,
      transition,
      marginTop: '-3px',
    };
  }
}
interface Props {
  onChange: (e: any, { name, value }: any) => void;
  className?: string;
  options?: any;
  value?: string;
  isDisabled?: boolean;
}
function FilterOperator(props: Props) {
  const { options, value, onChange, isDisabled = false, className = '' } = props;

  return (
    <div className="mx-2">
      <Select
        name="operator"
        options={options}
        styles={dropdownStyles}
        placeholder="Select"
        isDisabled={isDisabled}
        value={value ? options.find((i: any) => i.value === value) : null}
        onChange={({ value }: any) => onChange(null, { name: 'operator', value: value.value })}
      />
    </div>
  );
}

export default FilterOperator;