import React from 'react';
import cn from 'classnames';
import { Popover, Button } from 'antd';
import stl from './controlButton.module.css';

interface IProps {
  label: string;
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
}

function ControlButton({
  label,
  disabled = false,
  onClick,
  hasErrors = false,
  active = false,
  popover = undefined,
  customTags,
}: IProps) {
  return (
    <Popover content={popover} open={popover ? undefined : false}>
      <Button
        size="small"
        onClick={onClick}
        id={`control-button-${label.toLowerCase()}`}
        disabled={disabled}
      >
        {customTags}
        {hasErrors && <div className={stl.labels}><div className={stl.errorSymbol} /></div>}
        <span className={cn('font-semibold hover:text-main', active ? 'color-main' : 'color-gray-darkest')}>
          {label}
        </span>
      </Button>
    </Popover>
  );
}

ControlButton.displayName = 'ControlButton';

export default ControlButton;
