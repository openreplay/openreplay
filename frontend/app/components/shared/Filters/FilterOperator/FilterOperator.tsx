import React from 'react';
import Select from 'Shared/Select';

const dropdownStyles = {
  control: (provided: any) => {
    const obj = {
      ...provided,
      border: 'solid thin #ddd',
      boxShadow: 'none !important',
      cursor: 'pointer',
      height: '26px',
      minHeight: '26px',
      backgroundColor: 'white',
      borderRadius: '.5rem',
      '&:hover': {
        borderColor: 'rgb(115 115 115 / 0.9)',
      },
    };

    return obj;
  },
  valueContainer: (provided: any) => ({
    ...provided,
    width: 'fit-content',
    height: 26,
    '& input': {
      marginTop: '-3px',
    },
  }),
  placeholder: (provided: any) => ({
    ...provided,
  }),
  indicatorsContainer: (provided: any) => ({
    display: 'none',
  }),
  // option: (provided: any, state: any) => ({
  //   ...provided,
  //   whiteSpace: 'nowrap',
  // }),
  menu: (provided: any, state: any) => ({
    ...provided,
    marginTop: '0.5rem',
    left: 0,
    minWidth: 'fit-content',
    overflow: 'hidden',
    zIndex: 100,
    border: 'none',
    boxShadow: '0px 4px 10px rgba(0,0,0, 0.15)',
  }),
  container: (provided: any) => ({
    ...provided,
    minWidth: 'max-content',
  }),
  singleValue: (provided: any, state: { isDisabled: any }) => {
    const opacity = state.isDisabled ? 0.5 : 1;
    const transition = 'opacity 300ms';

    return {
      ...provided,
      opacity,
      transition,
      marginTop: '-3px',
    };
  },
};
interface Props {
  onChange: (e: any, { name, value }: any) => void;
  className?: string;
  options?: any;
  value?: string;
  isDisabled?: boolean;
}
function FilterOperator(props: Props) {
  const {
    options,
    value,
    onChange,
    isDisabled = false,
    className = '',
  } = props;

  return (
    <div className="mx-2">
      <Select
        name="operator"
        options={options || []}
        styles={dropdownStyles}
        placeholder="Select"
        isDisabled={isDisabled}
        value={value ? options?.find((i: any) => i.value === value) : null}
        onChange={({ value }: any) =>
          onChange(null, { name: 'operator', value: value.value })
        }
        className="btn-event-operator"
      />
    </div>
  );
}

export default FilterOperator;
