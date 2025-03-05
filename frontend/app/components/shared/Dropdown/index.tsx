import React from 'react';
import { Dropdown, MenuProps } from 'antd';

function AntlikeDropdown(props: {
  label: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  menuProps: MenuProps;
  useButtonStyle?: boolean;
  className?: string;
}) {
  const { label, leftIcon, rightIcon, menuProps, useButtonStyle, className } =
    props;
  return (
    <Dropdown menu={menuProps} className="px-2 py-1">
      {useButtonStyle ? (
        <div className="flex items-center gap-2 border border-gray-light rounded cursor-pointer">
          {leftIcon}
          <span>{label}</span>
          {rightIcon}
        </div>
      ) : (
        <div className="cursor-pointer flex items-center gap-2">
          {leftIcon}
          <span>{label}</span>
          {rightIcon}
        </div>
      )}
    </Dropdown>
  );
}

export default AntlikeDropdown;
