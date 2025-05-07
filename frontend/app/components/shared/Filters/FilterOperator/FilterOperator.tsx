import React from 'react';
import Select from 'Shared/Select';

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
        styles={{ height: 26 }}
        popupMatchSelectWidth={false}
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
