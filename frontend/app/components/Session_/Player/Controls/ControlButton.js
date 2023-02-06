import React from 'react';
import cn from 'classnames';
import { Icon } from 'UI';
import stl from './controlButton.module.css';

const ControlButton = ({
  label,
  icon = '',
  disabled = false,
  onClick,
  // count = 0,
  hasErrors = false,
  active = false,
  size = 20,
  noLabel,
  labelClassName,
  containerClassName,
  noIcon,
}) => (
  <button
    className={cn(
      stl.controlButton,
      { [stl.disabled]: disabled },
      'relative',
      active ? 'border-b-2 border-main' : 'rounded',
      containerClassName
    )}
    onClick={onClick}
    id={'control-button-' + label.toLowerCase()}
    disabled={disabled}
  >
    <div className={stl.labels}>
      {hasErrors && <div className={stl.errorSymbol} />}
      {/* {count > 0 && <div className={stl.countLabel}>{count}</div>} */}
    </div>
    {!noIcon && <Icon name={icon} size={size} color="gray-dark" />}
    {!noLabel && (
      <span className={cn(stl.label, labelClassName, active ? 'color-main' : 'color-gray-darkest')}>
        {label}
      </span>
    )}
  </button>
);

ControlButton.displayName = 'ControlButton';

export default ControlButton;
