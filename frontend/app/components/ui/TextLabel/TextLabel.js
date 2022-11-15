import React from 'react';
import cn from 'classnames';
import { Icon, Tooltip } from 'UI';
import styles from './textLabel.module.css';

export default function TextLabel({
  icon,
  label,
  minWidth = 0,
  maxWidth = false,
  popupLabel = false,
  textTransform = '',
  color = 'gray-medium',
  iconColor = color,
}) {
  return (
    <div
      className={cn('flex items-center', styles.sessionLabel)}
      style={{ minWidth: `${minWidth}` }}
    >
      <Icon name={icon} size="16" color={iconColor} />
      {popupLabel ? (
        <Tooltip title={popupLabel}>
          <div style={{ maxWidth: `${maxWidth}px` }} className={textTransform}>
            {label}
          </div>
        </Tooltip>
      ) : (
        <div
          style={{ maxWidth: `${maxWidth}px`, lineHeight: '16px' }}
          className={cn(`color-${color}`, textTransform)} // textTransform by tailwind
        >
          {label}
        </div>
      )}
    </div>
  );
}
