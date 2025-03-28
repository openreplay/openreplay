import React from 'react';
import cn from 'classnames';
import { Popover, Button } from 'antd';
import stl from './controlButton.module.css';

interface IProps {
  label: React.ReactNode;
  icon?: string;
  disabled?: boolean;
  onClick?: () => void;
  count?: number;
  hasErrors?: boolean;
  active?: boolean;
  size?: number;
  noLabel?: boolean;
  labelClassName?: string;
  containerClassName?: string;
  noIcon?: boolean;
  popover?: React.ReactNode;
  customTags?: React.ReactNode;
  customKey?: string;
}

function ControlButton({
  label,
  disabled = false,
  onClick,
  hasErrors = false,
  active = false,
  popover = undefined,
  customTags,
  customKey,
}: IProps) {
  return (
    <Popover content={popover} open={popover ? undefined : false}>
      <Button
        size="small"
        onClick={onClick}
        id={`control-button-${customKey ? customKey.toLowerCase() : label!.toString().toLowerCase()}`}
        disabled={disabled}
      >
        {customTags}
        {hasErrors && (
          <div className="w-2 h-2 rounded-full bg-red" />
        )}
        {label && <span
          className={cn(
            'font-semibold hover:text-main',
            active ? 'color-main' : 'color-gray-darkest',
          )}
        >
          {label}
        </span>}
      </Button>
    </Popover>
  );
}

ControlButton.displayName = 'ControlButton';

export default ControlButton;
