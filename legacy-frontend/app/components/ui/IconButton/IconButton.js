import React from 'react';
import cn from 'classnames';
import { CircularLoader, Icon, Tooltip } from 'UI';
import stl from './iconButton.module.css';

const IconButton = React.forwardRef(
  (
    {
      icon,
      label = false,
      active,
      onClick,
      plain = false,
      shadow = false,
      red = false,
      primary = false,
      primaryText = false,
      redText = false,
      outline = false,
      loading = false,
      roundedOutline = false,
      hideLoader = false,
      circle = false,
      size = 'default',
      marginRight,
      buttonSmall,
      className = '',
      style,
      name,
      disabled = false,
      tooltip = false,
      tooltipPosition = 'top center',
      compact = false,
      ...rest
    },
    ref
  ) => (
    <Tooltip title={tooltip} position={tooltipPosition}>
      <button
        ref={ref}
        name={name}
        className={cn(stl.button, className, {
          [stl.plain]: plain,
          [stl.active]: active,
          [stl.shadow]: shadow,
          [stl.primary]: primary,
          [stl.red]: red,
          [stl.primaryText]: primaryText,
          [stl.redText]: redText,
          [stl.outline]: outline,
          [stl.circle]: circle,
          [stl.roundedOutline]: roundedOutline,
          [stl.buttonSmall]: buttonSmall,
          [stl.small]: size === 'small',
          [stl.tiny]: size === 'tiny',
          [stl.marginRight]: marginRight,
          [stl.compact]: compact,
          [stl.hasLabel]: !!label,
        })}
        onClick={onClick}
        disabled={disabled || loading}
        style={style}
        {...rest}
      >
        {!hideLoader && <CircularLoader loading={loading} />}
        {icon && (
          <Icon
            color="teal"
            name={icon}
            data-hidden={loading}
            size={size === 'tiny' || size === 'small' || buttonSmall ? '14' : '16'}
          />
        )}
        {label && <span className={cn(stl.label, icon || loading ? 'ml-2' : '')}>{label}</span>}
      </button>
    </Tooltip>
  )
);

IconButton.displayName = 'IconButton';
export default IconButton;
