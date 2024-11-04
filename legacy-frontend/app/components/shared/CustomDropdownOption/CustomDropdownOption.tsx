import React from 'react';
import { components, OptionProps } from 'react-select';
import { Icon, Tooltip } from 'UI';
import cn from 'classnames';
import { ENTERPRISE_REQUEIRED } from 'App/constants';

export interface Props extends OptionProps {
  icon?: string;
  label: string;
  description: string;
  disabled?: boolean;
}
function CustomDropdownOption(props: Props) {
  const { icon = '', label, description, isSelected, isFocused, disabled } = props;
  return (
    <components.Option {...props} className="!p-0 mb-2">
      <Tooltip disabled={!disabled} title={ENTERPRISE_REQUEIRED} delay={0}>
        <div
          className={cn(
            'cursor-pointer group p-2 flex item-start border border-transparent rounded hover:!bg-active-blue !leading-0',
            { 'opacity-30': disabled }
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
      </Tooltip>
    </components.Option>
  );
}

export default CustomDropdownOption;
