import React from 'react';
import { components, OptionProps } from 'react-select';
import { Icon } from 'UI';
import cn from 'classnames';

export interface Props extends OptionProps {
  icon?: string;
  label: string;
  description: string;
}
function CustomDropdownOption(props: Props) {
  const { icon = '', label, description, isSelected, isFocused } = props;
  return (
    <components.Option {...props} className="!p-0 mb-2">
      <div
        className={cn(
          'group p-2 flex item-start border border-transparent rounded hover:border-teal hover:!bg-active-blue !leading-0'
        )}
      >
        {icon && (
          <Icon
            // @ts-ignore
            name={icon}
            className="pt-2 mr-3"
            size={18}
            color={isSelected || isFocused ? 'teal' : 'gray-dark'}
          />
        )}
        <div className={cn('flex flex-col', { '!color-teal': isFocused || isSelected })}>
          <div className="font-medium leading-0">{label}</div>
          <div className="text-sm color-gray-dark">{description}</div>
        </div>
      </div>
    </components.Option>
  );
}

export default CustomDropdownOption;
