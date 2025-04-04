import React from 'react';
import { Dropdown, Menu, Button, Typography } from 'antd';

interface OptionType {
  label: React.ReactNode;
  value: string | number;
}

interface Props {
  name: string;
  options: OptionType[];
  value?: string | number;
  onChange: (
    event: unknown,
    payload: { name: string; value: string | number | undefined }
  ) => void;
  isDisabled?: boolean;
  className?: string;
  placeholder?: string;
  allowClear?: boolean;
  popupClassName?: string;
}

const CLEAR_VALUE_KEY = '__antd_clear_value__';

function FilterOperator(props: Props) {
  const {
    name,
    options,
    value,
    onChange,
    isDisabled = false,
    className = '',
    placeholder = 'select', // Default placeholder
    allowClear = false,     // Default from original component
    popupClassName = 'shadow-lg border border-gray-200 rounded-md w-fit' // Default popup class
  } = props;

  const selectedOption = options.find(option => option.value === value);
  const displayLabel = selectedOption ? selectedOption.label :
    <Typography.Text className="text-neutral-600">{placeholder}</Typography.Text>;

  const handleMenuClick = (e: { key: string }) => {
    let selectedValue: string | number | undefined;

    if (e.key === CLEAR_VALUE_KEY) {
      selectedValue = undefined;
    } else {
      const clickedOption = options.find(option => String(option.value) === e.key);
      selectedValue = clickedOption?.value;
    }

    onChange(null, { name: name, value: selectedValue });
  };

  const menu = (
    <Menu onClick={handleMenuClick} selectedKeys={value !== undefined ? [String(value)] : []}>
      {allowClear && value !== undefined && (
        <>
          <Menu.Item key={CLEAR_VALUE_KEY} danger>
            Clear Selection {/* Or use a specific label */}
          </Menu.Item>
          <Menu.Divider />
        </>
      )}
      {/* Map options to Menu.Item */}
      {options.map(option => (
        <Menu.Item key={String(option.value)}>
          {option.label}
        </Menu.Item>
      ))}
    </Menu>
  );

  return (
    <>
      <Dropdown
        overlay={menu}
        trigger={['click']}
        disabled={isDisabled}
        overlayClassName={popupClassName}
      >
        <Button type="default" size="small" disabled={isDisabled} className="w-fit">
          {displayLabel}
        </Button>
      </Dropdown>
    </>
  );
}

export default FilterOperator;
