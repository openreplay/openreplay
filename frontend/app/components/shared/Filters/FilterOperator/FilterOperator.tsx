import React from 'react';
import { Dropdown, Menu, Button } from 'antd'; // Import Dropdown, Menu, Button
import { DownOutlined } from '@ant-design/icons'; // Optional: Icon for the button

interface OptionType {
  label: React.ReactNode; // Label can be text or other React elements
  value: string | number;  // Value is typically string or number
}

interface Props {
  name: string;
  options: OptionType[];
  value?: string | number; // Should match the type of OptionType.value
  onChange: (
    event: unknown, // Keep original signature for compatibility upstream
    payload: { name: string; value: string | number | undefined }
  ) => void;
  isDisabled?: boolean;
  className?: string;
  placeholder?: string;
  allowClear?: boolean; // Prop name from original component
  popupClassName?: string; // Use this for the dropdown overlay class
}

// Define a special key for the clear action
const CLEAR_VALUE_KEY = '__antd_clear_value__';

function FilterOperator(props: Props) {
  const {
    name,
    options,
    value,
    onChange,
    isDisabled = false,
    className = '',
    placeholder = 'Select', // Default placeholder
    allowClear = false,     // Default from original component
    popupClassName = 'shadow-lg border border-gray-200 rounded-md w-fit' // Default popup class
  } = props;

  // Find the label of the currently selected option
  const selectedOption = options.find(option => option.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Handler for menu item clicks
  const handleMenuClick = (e: { key: string }) => {
    let selectedValue: string | number | undefined;

    if (e.key === CLEAR_VALUE_KEY) {
      // Handle the clear action
      selectedValue = undefined;
    } else {
      // Find the option corresponding to the key (which we set as the value)
      // Antd Menu keys are strings, so convert value to string for comparison/lookup if needed
      const clickedOption = options.find(option => String(option.value) === e.key);
      selectedValue = clickedOption?.value;
    }

    // Call the original onChange prop with the expected structure
    onChange(null, { name: name, value: selectedValue });
  };

  // Construct the menu items
  const menu = (
    <Menu onClick={handleMenuClick} selectedKeys={value !== undefined ? [String(value)] : []}>
      {/* Add Clear Option if allowClear is true and a value is selected */}
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
        trigger={['click']} // Open dropdown on click
        disabled={isDisabled}
        overlayClassName={popupClassName} // Apply the custom class to the overlay
      >
        {/* The Button acts as the trigger */}
        <Button type="default" size="small" disabled={isDisabled} className="w-fit text-sm">
          {displayLabel}
        </Button>
      </Dropdown>
    </>
  );
}

export default FilterOperator;
